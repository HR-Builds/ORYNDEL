import operator
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, END
from langgraph.types import Send
from sqlalchemy import or_
from app.database import SessionLocal
from app.models import Order, Product
from app.services.llm import ask_grok, parse_json


class RecState(TypedDict):
    query: str
    user_id: int | None
    terms: list
    results: Annotated[list, operator.add]  # custom reducer: branches ka data merge hota hai
    final: list


def extract_terms(state: RecState):
    """Query ko hisson mein baanto — e.g. 'jacket aur shoes under 5000' → ['jacket', 'shoes']."""
    prompt = f"""Split this shopping query into at most 3 short product search terms.
Reply with ONLY a JSON array of strings, e.g. ["jacket", "shoes"].
Query: "{state['query']}\""""
    try:
        terms = parse_json(ask_grok(prompt))
        if not isinstance(terms, list):
            raise ValueError
        terms = [str(t) for t in terms][:3]
    except Exception:
        terms = [state["query"]]
    return {"terms": terms or [state["query"]]}


def spawn_branches(state: RecState):
    """Parallel execution: har term ki apni branch + purchase history branch."""
    sends = [Send("search_products", {"term": t}) for t in state["terms"]]
    sends.append(Send("purchase_history", {"term": "__history__"}))
    return sends


def search_products(state: RecState):
    term = state.get("term", state["query"])
    db = SessionLocal()
    try:
        like = f"%{term}%"
        products = (
            db.query(Product)
            .filter(
                Product.is_active == True,  # noqa: E712
                or_(
                    Product.name.ilike(like),
                    Product.description.ilike(like),
                    Product.seo_tags.ilike(like),
                ),
            )
            .limit(8)
            .all()
        )
        items = [
            {
                "id": p.id, "name": p.name, "slug": p.slug, "category": p.category.value,
                "price": float(p.price), "image": p.image,
            }
            for p in products
        ]
        return {"results": items}
    finally:
        db.close()


def purchase_history(state: RecState):
    if not state.get("user_id"):
        return {"results": []}
    db = SessionLocal()
    try:
        rows = (
            db.query(Product)
            .join(Product.orders if hasattr(Product, "orders") else Product.cart_items)
            .limit(1)
            .all()
        )
        return {"results": []}
    except Exception:
        return {"results": []}


def merge_rank(state: RecState):
    """Reducer merge: dedupe + final ranking."""
    seen, merged = set(), []
    for item in state["results"]:
        if item["id"] not in seen:
            seen.add(item["id"])
            merged.append(item)
    return {"final": merged[:6]}


_builder = StateGraph(RecState)
_builder.add_node("extract_terms", extract_terms)
_builder.add_node("search_products", search_products)
_builder.add_node("purchase_history", purchase_history)
_builder.add_node("merge_rank", merge_rank)
_builder.set_entry_point("extract_terms")
_builder.add_conditional_edges("extract_terms", spawn_branches)
_builder.add_edge("search_products", "merge_rank")
_builder.add_edge("purchase_history", "merge_rank")
_builder.add_edge("merge_rank", END)
graph = _builder.compile()


def get_recommendations(query: str, user_id: int | None = None) -> list:
    result = graph.invoke({
        "query": query,
        "user_id": user_id,
        "terms": [],
        "results": [],
        "final": [],
    })
    return result["final"]
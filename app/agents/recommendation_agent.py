
import operator
import re
from typing import Annotated, TypedDict

from langgraph.graph import StateGraph, END
from langgraph.types import Send
from sqlalchemy import or_

from app.database import SessionLocal
from app.models import Product


class RecState(TypedDict):
    query: str
    user_id: int | None
    terms: list
    results: Annotated[list, operator.add]
    final: list


STOP_WORDS = {
    "and", "or", "for", "with", "the", "a", "an", "in", "on",
    "to", "of", "under", "below", "above", "around", "show",
    "find", "search", "recommend", "recommendation", "me",
    "please", "want", "need", "buy", "best", "some",
}

# Common shopping words mapped to catalogue terminology.
SYNONYMS = {
    "jacket": ["jacket", "coat", "overcoat", "overshirt"],
    "coat": ["coat", "overcoat", "jacket"],
    "warm": ["wool", "winter", "warm"],
    "shoes": ["shoes", "shoe", "boots", "sneakers", "footwear"],
    "shoe": ["shoes", "shoe", "boots", "sneakers", "footwear"],
    "boot": ["boot", "boots", "chelsea"],
    "boots": ["boot", "boots", "chelsea"],
    "sneaker": ["sneaker", "sneakers", "shoes"],
    "sneakers": ["sneaker", "sneakers", "shoes"],
    "shirt": ["shirt", "overshirt"],
    "clothes": ["clothing", "shirt", "coat", "jacket"],
}


def extract_terms(state: RecState):
    query = state["query"].strip().lower()
    words = re.findall(r"[a-zA-Z0-9]+", query)

    terms = []
    for word in words:
        if word in STOP_WORDS or len(word) < 2:
            continue

        for term in [word] + SYNONYMS.get(word, []):
            if term not in terms:
                terms.append(term)

    # Keep the original phrase as a search term too.
    if query and query not in terms:
        terms.insert(0, query)

    return {"terms": terms}


def spawn_branches(state: RecState):
    return [
        Send("search_products", {"term": term})
        for term in state["terms"]
    ]


def search_products(state: RecState):
    term = (state.get("term") or "").strip()
    if not term:
        return {"results": []}

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
            .limit(20)
            .all()
        )

        return {
            "results": [
                {
                    "id": p.id,
                    "name": p.name,
                    "slug": p.slug,
                    "category": p.category.value,
                    "price": float(p.price),
                    "image": p.image,
                }
                for p in products
            ]
        }
    finally:
        db.close()


def merge_rank(state: RecState):
    query_words = [
        word for word in re.findall(r"[a-zA-Z0-9]+", state["query"].lower())
        if word not in STOP_WORDS and len(word) > 1
    ]

    # Expand query words for relevance scoring.
    expanded = set(query_words)
    for word in query_words:
        expanded.update(SYNONYMS.get(word, []))

    scored = {}
    for item in state["results"]:
        key = item["id"]
        name = item["name"].lower()
        category = item["category"].lower()

        # Score each unique product once, using all searchable fields.
        scored[key] = scored.get(key, (item, 0))
        searchable = f"{name} {category}".lower()

        score = 0
        for word in expanded:
            if word in searchable:
                score += 3
            elif word in name:
                score += 2

        # Category relevance for common shopping intent.
        if any(w in expanded for w in {"jacket", "coat", "overcoat", "wool"}):
            if category == "clothing":
                score += 2
        if any(w in expanded for w in {"shoes", "shoe", "boots", "boot", "sneakers", "footwear"}):
            if category == "footwear":
                score += 2

        previous_item, previous_score = scored[key]
        scored[key] = (previous_item, max(previous_score, score))

    ranked = [
        item for item, score in sorted(
            scored.values(), key=lambda pair: pair[1], reverse=True
        )
        if score > 0
    ]

    # Avoid returning unrelated products just because a weak term matched.
    return {"final": ranked[:6]}


_builder = StateGraph(RecState)
_builder.add_node("extract_terms", extract_terms)
_builder.add_node("search_products", search_products)
_builder.add_node("merge_rank", merge_rank)

_builder.set_entry_point("extract_terms")
_builder.add_conditional_edges("extract_terms", spawn_branches)
_builder.add_edge("search_products", "merge_rank")
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

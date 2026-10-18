from typing import TypedDict
from langgraph.graph import StateGraph, END
from tavily import TavilyClient
from app.config import settings
from app.database import SessionLocal
from app.models import AgentRun, Product
from app.services.llm import ask_grok, parse_json

MAX_ITERATIONS = 3


class PricingState(TypedDict, total=False):
    product_id: int
    product_name: str
    current_price: float
    iteration: int
    search_summary: str
    competitor_price: float | None
    plausible: bool
    suggestion: str


def search_web(state: PricingState):
    """Tavily se competitor prices dhoondo."""
    client = TavilyClient(api_key=settings.TAVILY_API_KEY)
    query = f"{state['product_name']} price Pakistan buy online"
    response = client.search(query=query, max_results=5)
    snippets = "\n".join(
        f"- {r.get('title')}: {r.get('content', '')[:220]}"
        for r in response.get("results", [])
    )
    return {
        "iteration": state.get("iteration", 0) + 1,
        "search_summary": snippets or "No results found.",
    }


def reviewer(state: PricingState):
    """Reviewer node: kya competitor ki sahi price mil gayi? Nahi to loop wapas."""
    prompt = f"""You are a pricing data reviewer.
Product: {state['product_name']}
Our price: {state['current_price']} PKR
Web findings:
{state['search_summary']}

Reply with ONLY JSON: {{"plausible": true/false, "competitor_price": number or null}}
plausible=true only if a real competitor price for a comparable product is visible."""
    try:
        data = parse_json(ask_grok(prompt))
        plausible = bool(data.get("plausible"))
        price = data.get("competitor_price")
        return {
            "plausible": plausible,
            "competitor_price": float(price) if price else None,
        }
    except Exception:
        return {"plausible": False, "competitor_price": None}


def route_loop(state: PricingState):
    if state.get("plausible") or state.get("iteration", 0) >= MAX_ITERATIONS:
        return "suggest"
    return "search_web"  # iterative: dobara search


def suggest(state: PricingState):
    comp = state.get("competitor_price")
    prompt = f"""Product: {state['product_name']}. Our price: {state['current_price']} PKR.
Competitor price found: {comp if comp else 'not found after multiple searches'}.
Write a one-sentence pricing recommendation for the admin (keep, raise, or lower, with a reason)."""
    suggestion = ask_grok(prompt)
    summary = (
        f"Iteration {state.get('iteration', 0)}. Competitor: {comp or 'n/a'} PKR vs ours "
        f"{state['current_price']} PKR. Suggestion: {suggestion}"
    )
    db = SessionLocal()
    try:
        db.add(AgentRun(
            agent="pricing",
            task=f"Pricing audit: {state['product_name']}",
            status="success",
            result=summary,
        ))
        db.commit()
    finally:
        db.close()
    return {"suggestion": summary}


_builder = StateGraph(PricingState)
_builder.add_node("search_web", search_web)
_builder.add_node("reviewer", reviewer)
_builder.add_node("suggest", suggest)
_builder.set_entry_point("search_web")
_builder.add_edge("search_web", "reviewer")
_builder.add_conditional_edges("reviewer", route_loop, {
    "search_web": "search_web",
    "suggest": "suggest",
})
_builder.add_edge("suggest", END)
graph = _builder.compile()


def run_pricing_audit(product_id: int) -> str:
    db = SessionLocal()
    try:
        product = db.get(Product, product_id)
        if not product:
            raise ValueError("Product not found")
        db.add(AgentRun(
            agent="pricing",
            task=f"Pricing audit: {product.name}",
            status="running",
            result="Auditor agent started...",
        ))
        db.commit()
        name, price = product.name, float(product.price)
    finally:
        db.close()

    result = graph.invoke({
        "product_id": product_id,
        "product_name": name,
        "current_price": price,
        "iteration": 0,
    })
    return result.get("suggestion", "Audit complete.")
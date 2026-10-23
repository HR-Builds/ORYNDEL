import re
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
    category: str
    description: str
    seo_tags: str
    current_price: float
    iteration: int
    search_summary: str
    candidates: list[dict]
    competitor_price: float | None
    competitor_name: str
    competitor_url: str
    competitor_evidence: str
    plausible: bool
    suggestion: str


def build_queries(state: PricingState) -> list[str]:
    """Create search queries based on the selected product."""
    name = state["product_name"]
    category = state.get("category", "")
    description = state.get("description", "")
    tags = state.get("seo_tags", "")

    context = " ".join(
        part for part in [name, category, description, tags] if part
    )[:250]

    return [
        f'"{name}" Pakistan price PKR',
        f'{context} Pakistan online store price PKR',
        f'{name} similar products Pakistan price Rs',
    ]


def extract_price_candidates(results: list[dict]) -> list[dict]:
    """Accept only prices explicitly marked as Pakistani rupees."""
    candidates = []

    price_pattern = re.compile(
        r"(?i)(?:PKR|Rs\.?|₨)\s*"
        r"([0-9][0-9,]*(?:\.\d{1,2})?)"
    )

    for item in results:
        title = str(item.get("title", ""))
        url = str(item.get("url", ""))
        content = str(item.get("content", ""))

        if not url.startswith(("https://", "http://")):
            continue

        # Search only text that the source actually returned.
        text = f"{title}\n{content}"

        for match in price_pattern.finditer(text):
            try:
                price = float(match.group(1).replace(",", ""))
            except ValueError:
                continue

            if price <= 0:
                continue

            start = max(0, match.start() - 120)
            end = min(len(text), match.end() + 180)

            candidates.append({
                "name": title,
                "url": url,
                "price": price,
                "evidence": text[start:end].strip(),
            })

    return candidates


def search_web(state: PricingState):
    """Search for product-specific Pakistani competitor prices."""
    iteration = state.get("iteration", 0) + 1

    if not settings.TAVILY_API_KEY:
        return {
            "iteration": iteration,
            "search_summary": "Search unavailable: Tavily API key is missing.",
        }

    queries = build_queries(state)
    query = queries[min(iteration - 1, len(queries) - 1)]

    try:
        client = TavilyClient(api_key=settings.TAVILY_API_KEY)
        response = client.search(
            query=query,
            max_results=8,
            search_depth="advanced",
        )

        results = response.get("results", [])
        new_candidates = extract_price_candidates(results)

        # Keep previous evidence so later searches add to it.
        existing = state.get("candidates", [])
        seen = {
            (c["url"], c["price"])
            for c in existing
        }

        for candidate in new_candidates:
            key = (candidate["url"], candidate["price"])
            if key not in seen:
                existing.append(candidate)
                seen.add(key)

        summary = "\n".join(
            f"Candidate {i}: {c['name']}\n"
            f"URL: {c['url']}\n"
            f"Price: PKR {c['price']:,.2f}\n"
            f"Evidence: {c['evidence']}"
            for i, c in enumerate(existing)
        )

        return {
            "iteration": iteration,
            "candidates": existing,
            "search_summary": summary or "No explicit PKR prices found.",
        }

    except Exception as exc:
        return {
            "iteration": iteration,
            "search_summary": (
                f"Search failed ({type(exc).__name__}). "
                "No new competitor evidence available."
            ),
        }


def reviewer(state: PricingState):
    """Select only a comparable product from actual search evidence."""
    candidates = state.get("candidates", [])

    if not candidates:
        return {
            "plausible": False,
            "competitor_price": None,
        }

    prompt = f"""
You are reviewing competitor pricing evidence for a Pakistani ecommerce store.

OUR PRODUCT
Name: {state['product_name']}
Category: {state.get('category', '')}
Description: {state.get('description', '')}
Tags: {state.get('seo_tags', '')}
Current price: PKR {state['current_price']:,.2f}

CANDIDATES EXTRACTED FROM REAL SEARCH RESULTS
{state.get('search_summary', '')}

Rules:
- Compare products of the same type and intended use.
- Reject unrelated categories, different product types, and misleading matches.
- Consider material, product format, size, and quantity when relevant.
- Accept only candidates whose evidence explicitly shows PKR, Rs, or ₨.
- The listed candidate prices were extracted from the supplied evidence.
- Never invent a competitor, price, URL, or source.
- If no candidate is genuinely comparable, reject all candidates.
- Never change our product price.
- Return JSON only.

If a comparable candidate exists:
{{"plausible": true, "candidate_index": 0,
  "reason": "brief explanation based on the supplied evidence"}}

Otherwise:
{{"plausible": false, "candidate_index": null,
  "reason": "why no candidate is sufficiently comparable"}}
"""

    try:
        data = parse_json(ask_grok(prompt))

        if data.get("plausible") is not True:
            return {
                "plausible": False,
                "competitor_price": None,
            }

        index = data.get("candidate_index")

        if isinstance(index, bool) or not isinstance(index, int):
            return {"plausible": False, "competitor_price": None}

        if index < 0 or index >= len(candidates):
            return {"plausible": False, "competitor_price": None}

        candidate = candidates[index]

        return {
            "plausible": True,
            "competitor_price": candidate["price"],
            "competitor_name": candidate["name"],
            "competitor_url": candidate["url"],
            "competitor_evidence": candidate["evidence"],
        }

    except Exception:
        return {
            "plausible": False,
            "competitor_price": None,
        }


def route_loop(state: PricingState):
    if state.get("plausible") or state.get("iteration", 0) >= MAX_ITERATIONS:
        return "suggest"
    return "search_web"


def suggest(state: PricingState):
    """Produce a recommendation and log it without changing product prices."""
    our_price = float(state["current_price"])
    competitor_price = state.get("competitor_price")

    if competitor_price is None:
        suggestion = (
            "MANUAL REVIEW: No sufficiently comparable product with a "
            f"verifiable PKR price was confirmed. Keep the current price "
            f"at PKR {our_price:,.2f} until reliable market evidence, "
            "costs, and margin are reviewed."
        )
    else:
        competitor_name = state.get("competitor_name", "Competitor")
        competitor_url = state.get("competitor_url", "")
        evidence = state.get("competitor_evidence", "")

        difference_percent = (
            (competitor_price - our_price) / our_price * 100
            if our_price > 0 else 0
        )

        if competitor_price > our_price:
            comparison = (
                f"Our price is {abs(difference_percent):.1f}% below "
                "the observed competitor price."
            )
        elif competitor_price < our_price:
            comparison = (
                f"Our price is {abs(difference_percent):.1f}% above "
                "the observed competitor price."
            )
        else:
            comparison = "Both observed prices are equal."

        suggestion = (
            f"MANUAL REVIEW: {comparison} "
            f"Our price: PKR {our_price:,.2f}. "
            f"Competitor: {competitor_name}, PKR {competitor_price:,.2f}. "
            f"Source: {competitor_url}. "
            f"Evidence: {evidence[:250]} "
            "Verify product comparability, costs, and margin before "
            "considering any price change."
        )

    summary = (
        f"Iteration {state.get('iteration', 0)}. "
        f"Product: {state['product_name']}. "
        f"Current price: PKR {our_price:,.2f}. "
        f"Suggestion: {suggestion}"
    )

    db = SessionLocal()
    try:
        db.add(
            AgentRun(
                agent="pricing",
                task=f"Pricing audit: {state['product_name']}",
                status="success",
                result=summary,
            )
        )
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
_builder.add_conditional_edges(
    "reviewer",
    route_loop,
    {"search_web": "search_web", "suggest": "suggest"},
)
_builder.add_edge("suggest", END)

graph = _builder.compile()


def run_pricing_audit(product_id: int) -> str:
    db = SessionLocal()

    try:
        product = db.get(Product, product_id)

        if not product:
            raise ValueError("Product not found")

        # Read product fields only. Never assign to product.price.
        name = product.name
        price = float(product.price)
        category = str(product.category)
        description = product.description or ""
        seo_tags = product.seo_tags or ""

        db.add(
            AgentRun(
                agent="pricing",
                task=f"Pricing audit: {name}",
                status="running",
                result="Audit started. Product price will not be modified.",
            )
        )
        db.commit()

    finally:
        db.close()

    result = graph.invoke({
        "product_id": product_id,
        "product_name": name,
        "current_price": price,
        "category": category,
        "description": description,
        "seo_tags": seo_tags,
        "iteration": 0,
        "candidates": [],
    })

    return result.get("suggestion", "Audit complete.")
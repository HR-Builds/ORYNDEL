import base64
import os
from typing import TypedDict
from langchain_core.messages import HumanMessage
from langgraph.graph import StateGraph, END
from app.database import SessionLocal
from app.models import AgentRun
from app.services.llm import get_gemini, ask_grok, parse_json
from app.services.images import delete_upload

MAX_REFINEMENTS = 2


class OnboardState(TypedDict, total=False):
    name: str
    image_path: str
    details: str
    category: str
    description: str
    seo_tags: str
    valid: bool
    feedback: str
    iteration: int


def analyze_image(state: OnboardState):
    """Node 1: Gemini vision — image se rang, material, style extract."""
    full_path = os.path.join("uploads", state["image_path"].removeprefix("/uploads/"))
    with open(full_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    ext = os.path.splitext(full_path)[1].lstrip(".") or "jpeg"
    msg = HumanMessage(content=[
        {"type": "text", "text": (
            f"Look at this product image for a fashion e-commerce store. Product name hint: "
            f"'{state['name']}'. Describe: primary colors, material, style, and the single best "
            f"category from: clothing, footwear, accessories, fragrance, cosmetics. Be concise."
        )},
        {"type": "image_url", "image_url": {"url": f"data:image/{ext};base64,{b64}"}},
    ])
    details = get_gemini().invoke([msg]).content.strip()
    return {"details": details}


def generate_copy(state: OnboardState):
    """Node 2: Grok — details se SEO-friendly description + tags likho."""
    prompt = f"""Write e-commerce copy for this product.
Name: {state['name']}
Visual details: {state['details']}
Rules: description 60-160 words, elegant luxury tone, no emojis, no exclamation marks.
Also pick category from: clothing, footwear, accessories, fragrance, cosmetics.
Also give 5-8 SEO tags, comma separated.
Reply with ONLY JSON: {{"description": "...", "category": "...", "seo_tags": "..."}}"""
    try:
        data = parse_json(ask_grok(prompt))
        return {
            "description": data.get("description", ""),
            "category": data.get("category", "accessories"),
            "seo_tags": data.get("seo_tags", ""),
            "iteration": state.get("iteration", 0) + 1,
        }
    except Exception:
        return {
            "description": state["details"][:400],
            "category": "accessories",
            "seo_tags": state["name"],
            "iteration": state.get("iteration", 0) + 1,
        }


def validate(state: OnboardState):
    """Validation node: platform rules check — warna wapas generation par."""
    desc_len = len(state.get("description", "").split())
    prompt = f"""You are a strict marketplace validator.
Product: {state['name']}
Description ({desc_len} words): {state['description'][:600]}
Check: 50-200 words, no emojis, no fake claims, mentions real product attributes.
Reply with ONLY JSON: {{"valid": true/false, "feedback": "one short sentence"}}"""
    try:
        data = parse_json(ask_grok(prompt))
        return {
            "valid": bool(data.get("valid")) and 40 <= desc_len <= 250,
            "feedback": data.get("feedback", ""),
        }
    except Exception:
        return {"valid": True, "feedback": ""}


def route_validation(state: OnboardState):
    if state.get("valid") or state.get("iteration", 0) >= MAX_REFINEMENTS:
        return "finish"
    return "generate_copy"  # iterative refinement


def finish(state: OnboardState):
    return {}


_builder = StateGraph(OnboardState)
_builder.add_node("analyze_image", analyze_image)
_builder.add_node("generate_copy", generate_copy)
_builder.add_node("validate", validate)
_builder.add_node("finish", finish)
_builder.set_entry_point("analyze_image")
_builder.add_edge("analyze_image", "generate_copy")
_builder.add_edge("generate_copy", "validate")
_builder.add_conditional_edges("validate", route_validation, {
    "generate_copy": "generate_copy",
    "finish": "finish",
})
_builder.add_edge("finish", END)
graph = _builder.compile()


def run_onboarding(name: str, image_path: str) -> dict:
    result = graph.invoke({
        "name": name,
        "image_path": image_path,
        "details": "",
        "category": "accessories",
        "description": "",
        "seo_tags": name,
        "valid": False,
        "feedback": "",
        "iteration": 0,
    })
    db = SessionLocal()
    try:
        db.add(AgentRun(
            agent="onboarding",
            task=f"Onboarding draft: {name}",
            status="success",
            result=f"Category: {result.get('category')}. Tags: {result.get('seo_tags')}. "
                   f"Refinements: {result.get('iteration', 0)}. {result.get('feedback', '')}",
        ))
        db.commit()
    finally:
        db.close()
    return {
        "name": name,
        "image_path": image_path,
        "category": result.get("category", "accessories"),
        "description": result.get("description", ""),
        "seo_tags": result.get("seo_tags", name),
    }
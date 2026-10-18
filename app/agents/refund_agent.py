import json
import uuid
from typing import TypedDict
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command
from app.database import SessionLocal
from app.models import AgentRun, Order, OrderStatus, Product
from app.services.llm import ask_grok

AUTO_REFUND_LIMIT = 5000  # PKR — is se neechay aur policy ke mutabiq to auto refund


class RefundState(TypedDict, total=False):
    request_text: str
    order_number: str
    user_id: int
    thread_id: str
    intent: str
    order_total: float
    order_status: str
    order_age_days: int
    decision: str
    final_message: str


def analyze_intent(state: RefundState):
    """Step 1: NLP — customer ki baat ka matlab samjho."""
    prompt = f"""Classify the customer request into exactly one of: refund, cancel, other.
Reply with ONLY one word.
Request: "{state['request_text']}\""""
    intent = (ask_grok(prompt) or "other").lower().strip()
    if intent not in ("refund", "cancel", "other"):
        intent = "other"
    return {"intent": intent}


def fetch_order(state: RefundState):
    """Step 2: Order details nikalo (SQLAlchemy)."""
    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.order_number == state["order_number"]).first()
        if not order:
            return {"order_total": 0, "order_status": "missing", "order_age_days": 0}
        from datetime import datetime
        age = (datetime.utcnow() - order.created_at).days
        return {
            "order_total": float(order.total_amount),
            "order_status": order.status.value if hasattr(order.status, "value") else str(order.status),
            "order_age_days": age,
        }
    finally:
        db.close()


def route_decision(state: RefundState):
    """Conditional routing: chhota + policy compliant = auto, warna admin ke paas."""
    if state["intent"] == "other" or state["order_status"] == "missing":
        return "explain"
    active = state["order_status"] in ("pending", "confirmed", "delivered")
    within_policy = state["order_age_days"] <= 7
    if state["order_total"] <= AUTO_REFUND_LIMIT and active and within_policy:
        return "auto_approve"
    return "human_review"


def explain(state: RefundState):
    msg = ("We could not match your request to a refund or cancellation. "
           if state["order_status"] != "missing"
           else f"No order found with number {state['order_number']}. ")
    return {"final_message": msg + "Contact support via the Contact page for help."}


def process_refund(state: RefundState, approved: bool, by_admin: bool):
    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.order_number == state["order_number"]).first()
        if order and approved and order.status not in (OrderStatus.cancelled, OrderStatus.refunded):
            for item in order.items:
                if item.product_id:
                    product = db.get(Product, item.product_id)
                    if product:
                        product.stock += item.quantity
            order.status = OrderStatus.refunded
        decision = "approved" if approved else "rejected"
        msg = (
            f"Your request for order {state['order_number']} was APPROVED. "
            "Amount will be returned via your original payment method."
            if approved else
            f"Your request for order {state['order_number']} was reviewed and could not be approved. "
            "Contact support for details."
        )
        db.add(AgentRun(
            agent="refund",
            task=f"Refund {'review ' if by_admin else ''}for {state['order_number']} — {decision.upper()}",
            status="success",
            result=msg + (f" (score check: amount {state.get('order_total', 0):.0f} PKR, "
                          f"status {state.get('order_status')}, {state.get('order_age_days', 0)}d old)"),
        ))
        db.commit()
        return msg
    finally:
        db.close()


def auto_approve(state: RefundState):
    msg = process_refund(state, approved=True, by_admin=False)
    return {"decision": "approved", "final_message": msg}


def human_review(state: RefundState):
    """Yeh node graph pause hone ke baad admin ke Command se resume hota hai."""
    approved = state.get("decision") == "approved"
    msg = process_refund(state, approved=approved, by_admin=True)
    return {"final_message": msg}


def _explain_router(state: RefundState):
    return END


_builder = StateGraph(RefundState)
_builder.add_node("analyze_intent", analyze_intent)
_builder.add_node("fetch_order", fetch_order)
_builder.add_node("auto_approve", auto_approve)
_builder.add_node("human_review", human_review)
_builder.add_node("explain", explain)
_builder.set_entry_point("analyze_intent")
_builder.add_edge("analyze_intent", "fetch_order")
_builder.add_conditional_edges("fetch_order", route_decision, {
    "auto_approve": "auto_approve",
    "human_review": "human_review",
    "explain": "explain",
})
_builder.add_edge("auto_approve", END)
_builder.add_edge("explain", END)
_builder.add_edge("human_review", END)

memory = MemorySaver()
# BRD: graph pause ho jayega jab case complex ho — interrupt BEFORE human_review
graph = _builder.compile(checkpointer=memory, interrupt_before=["human_review"])


def run_refund_request(order_number: str, request_text: str, user_id: int) -> AgentRun:
    db = SessionLocal()
    try:
        thread_id = uuid.uuid4().hex
        run = AgentRun(
            agent="refund",
            task=f"Refund request for {order_number}",
            status="running",
            result=json.dumps({"thread_id": thread_id}),
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        run_id = run.id
    finally:
        db.close()

    config = {"configurable": {"thread_id": thread_id}}
    graph.invoke({
        "request_text": request_text,
        "order_number": order_number,
        "user_id": user_id,
        "thread_id": thread_id,
    }, config=config)

    db = SessionLocal()
    try:
        run = db.get(AgentRun, run_id)
        snapshot = graph.get_state(config)
        if snapshot.next:  # graph is paused at human_review
            run.status = "awaiting_review"
            run.result = json.dumps({
                "thread_id": thread_id,
                "message": "Case forwarded to admin review (large amount or complex case).",
            })
        else:
            run.status = "success"
        db.commit()
        return run
    finally:
        db.close()


def review_refund(run_id: int, approve: bool) -> str:
    db = SessionLocal()
    try:
        run = db.get(AgentRun, run_id)
        if not run or run.agent != "refund":
            raise ValueError("Refund run not found")
        if run.status != "awaiting_review":
            raise ValueError("This request is not pending review")
        data = json.loads(run.result or "{}")
        thread_id = data.get("thread_id")
    finally:
        db.close()

    config = {"configurable": {"thread_id": thread_id}}
    graph.invoke(Command(resume={"decision": "approved" if approve else "rejected"}), config=config)
    snapshot = graph.get_state(config)
    message = snapshot.values.get("final_message", "Review completed.")

    db = SessionLocal()
    try:
        run = db.get(AgentRun, run_id)
        run.status = "success" if approve else "failed"
        run.result = message
        db.commit()
    finally:
        db.close()
    return message
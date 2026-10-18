from datetime import datetime, timedelta
from typing import TypedDict
from langgraph.graph import StateGraph, END
from app.database import SessionLocal
from app.models import AgentRun, Order

FLAG_THRESHOLD = 60


class FraudState(TypedDict):
    order_id: int
    ip: str | None
    score: int
    reasons: list


def check_identity(state: FraudState):
    """Node 1: email, phone aur IP address ki basic sanity."""
    db = SessionLocal()
    try:
        order = db.get(Order, state["order_id"])
        score, reasons = state["score"], list(state["reasons"])
        if not order:
            return {"score": 100, "reasons": ["Order not found"]}
        email = order.email or ""
        if "@" not in email or "." not in email.split("@")[-1]:
            score += 25
            reasons.append("Invalid email format (+25)")
        digits = sum(c.isdigit() for c in (order.phone_number or ""))
        if digits < 10:
            score += 25
            reasons.append("Suspicious phone number (+25)")
        ip = state.get("ip")
        if ip and (ip.startswith("127.") or ip.startswith("192.168.") or ip.startswith("10.")):
            score += 15
            reasons.append("Private/internal IP address (+15)")
        return {"score": score, "reasons": reasons}
    finally:
        db.close()


def check_payment(state: FraudState):
    """Node 2: payment method aur amount ke risk signals."""
    db = SessionLocal()
    try:
        order = db.get(Order, state["order_id"])
        score, reasons = state["score"], list(state["reasons"])
        amount = float(order.total_amount)
        if order.payment_method.value == "cod" and amount > 50000:
            score += 30
            reasons.append("High-value Cash on Delivery order (+30)")
        if amount > 100000:
            score += 25
            reasons.append("Unusually large order amount (+25)")
        return {"score": score, "reasons": reasons}
    finally:
        db.close()


def check_velocity(state: FraudState):
    """Node 3: kitni jaldi orders place ho rahe hain."""
    db = SessionLocal()
    try:
        order = db.get(Order, state["order_id"])
        score, reasons = state["score"], list(state["reasons"])
        since = datetime.utcnow() - timedelta(hours=24)
        recent = (
            db.query(Order)
            .filter(
                Order.email == order.email,
                Order.created_at >= since,
                Order.status != "cancelled",
            )
            .count()
        )
        if recent > 2:
            score += 30
            reasons.append(f"{recent} orders in last 24h (+30)")
        elif recent == 2:
            score += 15
            reasons.append("2 orders in last 24h (+15)")
        return {"score": score, "reasons": reasons}
    finally:
        db.close()


def finalize(state: FraudState):
    db = SessionLocal()
    try:
        order = db.get(Order, state["order_id"])
        flagged = state["score"] >= FLAG_THRESHOLD
        order.fraud_score = state["score"]
        order.fraud_flag = flagged
        db.add(AgentRun(
            agent="fraud",
            task=f"Fraud screening for {order.order_number}",
            status="success",
            result=f"Score {state['score']}/100 — {'FLAGGED' if flagged else 'SAFE'}. "
                   + ("; ".join(state["reasons"]) if state["reasons"] else "No risk signals."),
        ))
        db.commit()
    finally:
        db.close()
    return {}


_builder = StateGraph(FraudState)
_builder.add_node("check_identity", check_identity)
_builder.add_node("check_payment", check_payment)
_builder.add_node("check_velocity", check_velocity)
_builder.add_node("finalize", finalize)
_builder.set_entry_point("check_identity")
_builder.add_edge("check_identity", "check_payment")
_builder.add_edge("check_payment", "check_velocity")
_builder.add_edge("check_velocity", "finalize")
_builder.add_edge("finalize", END)
graph = _builder.compile()


def run_fraud_check(order_id: int, ip: str | None = None):
    """Runs the sequential fraud pipeline in the background after checkout."""
    graph.invoke({
        "order_id": order_id,
        "ip": ip,
        "score": 0,
        "reasons": [],
    })
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user, get_current_user_optional, get_admin_user
from app.models import User
from app.agents.refund_agent import run_refund_request, review_refund
from app.agents.recommendation_agent import get_recommendations
from app.agents.pricing_agent import run_pricing_audit
from app.agents.onboarding_agent import run_onboarding
from app.services.images import save_upload, delete_upload

router = APIRouter()


class RefundRequest(BaseModel):
    order_number: str
    message: str


@router.post("/refund-request", status_code=201)
def request_refund(
    data: RefundRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order = db.query(__import__("app.models", fromlist=["Order"]).Order) \
        .filter_by(order_number=data.order_number).first()
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="Order not found")
    run = run_refund_request(data.order_number, data.message, user.id)
    return {
        "run_id": run.id,
        "status": run.status,
        "message": (
            "Refund request received and auto-approved." if run.status == "success"
            else "Refund request received and forwarded to admin review."
        ),
    }


@router.get("/recommendations")
def recommendations(
    q: str,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query is required")
    return {"items": get_recommendations(q, user.id if user else None)}


@router.post("/admin/agents/refunds/{run_id}/approve")
def approve_refund(run_id: int, admin: User = Depends(get_admin_user)):
    try:
        message = review_refund(run_id, approve=True)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": message}


@router.post("/admin/agents/refunds/{run_id}/reject")
def reject_refund(run_id: int, admin: User = Depends(get_admin_user)):
    try:
        message = review_refund(run_id, approve=False)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": message}


@router.post("/admin/agents/pricing/run")
def pricing_run(product_id: int, admin: User = Depends(get_admin_user)):
    try:
        suggestion = run_pricing_audit(product_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"suggestion": suggestion}


@router.post("/admin/agents/onboard")
def onboard(
    name: str = Form(...),
    file: UploadFile = File(...),
    admin: User = Depends(get_admin_user),
):
    image_path = save_upload(file, "onboarding")
    try:
        result = run_onboarding(name, image_path)
    except Exception as e:
        delete_upload(image_path)
        raise HTTPException(status_code=502, detail=f"Agent failed: {e}")
    return result
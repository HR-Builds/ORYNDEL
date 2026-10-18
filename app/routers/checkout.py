
import os
import secrets
from datetime import datetime
from decimal import Decimal

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Request,
    UploadFile,
)
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models import (
    CartItem,
    Order,
    OrderItem,
    PaymentMethod,
    PromoCode,
    User,
)
from app.schemas.order import CheckoutRequest, OrderOut
from app.agents.fraud_agent import run_fraud_check


router = APIRouter()


def generate_order_number() -> str:
    return f"ORD-{datetime.now():%Y%m%d}-{secrets.token_hex(3).upper()}"


@router.get("/payment-methods")
def payment_methods():
    return {
        "methods": [
            {"id": "cod", "label": "Cash on Delivery"},
            {"id": "bank_transfer", "label": "Bank Transfer"},
        ],
        "bank": {
            "bank_name": settings.BANK_NAME,
            "account_title": settings.BANK_ACCOUNT_TITLE,
            "account_number": settings.BANK_ACCOUNT_NUMBER,
        },
    }


@router.get("/validate-promo")
def validate_promo(code: str, db: Session = Depends(get_db)):
    promo = (
        db.query(PromoCode)
        .filter(
            PromoCode.code == code.upper(),
            PromoCode.active == True,
        )
        .first()
    )

    if not promo or (
        promo.expiry_date and promo.expiry_date < datetime.utcnow()
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired promo code",
        )

    return {
        "code": promo.code,
        "discount_percent": promo.discount_percent,
    }


@router.post("", response_model=OrderOut, status_code=201)
def checkout(
    data: CheckoutRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cart_items = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id)
        .all()
    )

    if not cart_items:
        raise HTTPException(
            status_code=400,
            detail="Cart is empty",
        )

    subtotal = Decimal("0")

    for item in cart_items:
        p = item.product

        if not p.is_active or p.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"'{p.name}' is out of stock",
            )

        subtotal += Decimal(p.price) * item.quantity

    promo = None

    if data.promo_code:
        promo = (
            db.query(PromoCode)
            .filter(
                PromoCode.code == data.promo_code.upper(),
                PromoCode.active == True,
            )
            .first()
        )

        if not promo or (
            promo.expiry_date and promo.expiry_date < datetime.utcnow()
        ):
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired promo code",
            )

    discount = Decimal("0")

    if promo:
        discount = (
            subtotal
            * Decimal(promo.discount_percent)
            / Decimal(100)
        ).quantize(Decimal("0.01"))

    order = Order(
        order_number=generate_order_number(),
        user_id=user.id,
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email.lower(),
        phone_number=data.phone_number,
        address=data.address,
        city=data.city,
        postal_code=data.postal_code,
        country=data.country,
        landmark=data.landmark,
        payment_method=data.payment_method,
        promo_code=promo.code if promo else None,
        total_amount=subtotal - discount,
    )

    db.add(order)
    db.flush()

    for item in cart_items:
        p = item.product

        db.add(
            OrderItem(
                order_id=order.id,
                product_id=p.id,
                product_name=p.name,
                price=p.price,
                quantity=item.quantity,
                image=p.image,
            )
        )

        p.stock -= item.quantity
        db.delete(item)

    db.commit()
    db.refresh(order)

    # Pass the client IP to the fraud-check agent.
    client_ip = request.client.host if request.client else None
    background_tasks.add_task(
        run_fraud_check,
        order.id,
        client_ip,
    )

    return order


@router.post("/{order_id}/payment-proof")
def upload_payment_proof(
    order_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order = db.get(Order, order_id)

    if not order or order.user_id != user.id:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    if order.payment_method != PaymentMethod.bank_transfer:
        raise HTTPException(
            status_code=400,
            detail="Payment proof is only for bank transfer orders",
        )

    ext = os.path.splitext(file.filename or "")[1].lower()

    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG or WEBP images are allowed",
        )

    folder = os.path.join(
        settings.UPLOAD_DIR,
        "payment_screenshots",
    )
    os.makedirs(folder, exist_ok=True)

    path = os.path.join(folder, f"order_{order.id}{ext}")

    with open(path, "wb") as f:
        f.write(file.file.read())

    order.payment_screenshot = (
        f"/uploads/payment_screenshots/order_{order.id}{ext}"
    )

    db.commit()

    return {
        "message": "Payment proof uploaded",
        "path": order.payment_screenshot,
    }

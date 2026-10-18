from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user, get_admin_user
from app.models import Order, OrderStatus, Product, User

router = APIRouter()


@router.get("")
def my_orders(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return (
        db.query(Order)
        .filter(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
        .all()
    )


@router.get("/{order_number}")
def order_detail(
    order_number: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(Order.order_number == order_number).first()
    if not order or (order.user_id != user.id and not user.is_admin):
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("/{order_id}/cancel")
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order = db.get(Order, order_id)
    if not order or (order.user_id != user.id and not user.is_admin):
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != OrderStatus.pending:
        raise HTTPException(status_code=400, detail="Only pending orders can be cancelled")
    for item in order.items:
        if item.product_id:
            product = db.get(Product, item.product_id)
            if product:
                product.stock += item.quantity
    order.status = OrderStatus.cancelled
    db.commit()
    return {"message": "Order cancelled"}
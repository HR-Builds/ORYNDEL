from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models import CartItem, Product, User
from app.schemas.cart import CartAdd, CartOut, CartItemUpdate

router = APIRouter()


def cart_response(db: Session, user: User) -> CartOut:
    items = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id)
        .order_by(CartItem.id.desc())
        .all()
    )
    total = sum(Decimal(i.product.price) * i.quantity for i in items)
    return CartOut(items=items, total=total)


@router.get("", response_model=CartOut)
def get_cart(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return cart_response(db, user)


@router.post("", status_code=201)
def add_to_cart(
    data: CartAdd,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if data.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")
    product = db.get(Product, data.product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")
    item = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id, CartItem.product_id == product.id)
        .first()
    )
    new_qty = (item.quantity if item else 0) + data.quantity
    if product.stock < new_qty:
        raise HTTPException(status_code=400, detail="Not enough stock available")
    if item:
        item.quantity = new_qty
    else:
        db.add(CartItem(user_id=user.id, product_id=product.id, quantity=data.quantity))
    db.commit()
    return {"message": "Added to cart"}


@router.patch("/{item_id}", response_model=CartOut)
def update_item(
    item_id: int,
    data: CartItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = db.get(CartItem, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(status_code=404, detail="Cart item not found")
    if data.quantity <= 0:
        db.delete(item)
    else:
        if item.product.stock < data.quantity:
            raise HTTPException(status_code=400, detail="Not enough stock available")
        item.quantity = data.quantity
    db.commit()
    return cart_response(db, user)


@router.delete("/{item_id}", response_model=CartOut)
def remove_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = db.get(CartItem, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(status_code=404, detail="Cart item not found")
    db.delete(item)
    db.commit()
    return cart_response(db, user)
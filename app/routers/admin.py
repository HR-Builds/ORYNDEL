from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_admin_user
from app.models import (
    Contact, Order, OrderStatus, Product, PromoCode, Slider, User, slugify, AgentRun,
)
from app.schemas.product import ProductCreate, ProductOut
from app.services.images import save_upload, delete_upload

router = APIRouter()


# ---------- Dashboard stats ----------

@router.get("/stats")
def stats(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    revenue = (
        db.query(func.coalesce(func.sum(Order.total_amount), 0))
        .filter(Order.status != OrderStatus.cancelled)
        .scalar()
    )
    return {
        "revenue": float(revenue),
        "orders": db.query(Order).count(),
        "pending_orders": db.query(Order).filter(Order.status == OrderStatus.pending).count(),
        "flagged_orders": db.query(Order).filter(Order.fraud_flag == True).count(),
        "users": db.query(User).filter(User.is_admin == False).count(),
        "products": db.query(Product).count(),
        "low_stock": db.query(Product)
        .filter(Product.stock < 5, Product.is_active == True)
        .count(),
        "messages": db.query(Contact).count(),
    }


# ---------- Products ----------

@router.get("/products")
def admin_products(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
    search: str | None = None,
    category: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = db.query(Product)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(Product.name.ilike(term), Product.slug.ilike(term))
        )
    if category:
        query = query.filter(Product.category == category)
    total = query.count()
    items = (
        query.order_by(Product.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return {"total": total, "page": page, "pages": (total + limit - 1) // limit, "items": items}


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    slug = slugify(data.name)
    base, i = slug, 2
    while db.query(Product).filter(Product.slug == slug).first():
        slug = f"{base}-{i}"
        i += 1
    product = Product(**data.model_dump(), slug=slug)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    data: ProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in data.model_dump().items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    delete_upload(product.image)
    db.delete(product)
    db.commit()


@router.post("/products/{product_id}/image")
def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    delete_upload(product.image)
    product.image = save_upload(file, "products")
    db.commit()
    return {"image": product.image}


# ---------- Orders ----------

@router.get("/orders")
def admin_orders(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
    status: OrderStatus | None = None,
    fraud_only: bool = False,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = db.query(Order)
    if status:
        query = query.filter(Order.status == status)
    if fraud_only:
        query = query.filter(Order.fraud_flag == True)
    total = query.count()
    items = (
        query.order_by(Order.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return {"total": total, "page": page, "pages": (total + limit - 1) // limit, "items": items}


@router.patch("/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    status: OrderStatus,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = status
    db.commit()
    return {"message": "Order status updated", "status": order.status}


# ---------- Users ----------

@router.get("/users")
def admin_users(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = db.query(User).filter(User.is_admin == False)
    if search:
        term = f"%{search}%"
        query = query.filter(or_(User.email.ilike(term), User.username.ilike(term)))
    total = query.count()
    items = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return {"total": total, "page": page, "pages": (total + limit - 1) // limit, "items": items}


@router.patch("/users/{user_id}/active")
def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"message": "User updated", "is_active": user.is_active}


@router.patch("/users/{user_id}/admin")
def toggle_user_admin(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot change your own admin role")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = not user.is_admin
    db.commit()
    return {"message": "User updated", "is_admin": user.is_admin}


# ---------- Promo codes ----------

@router.get("/promos")
def list_promos(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    return db.query(PromoCode).order_by(PromoCode.id.desc()).all()


@router.post("/promos", status_code=201)
def create_promo(
    code: str = Form(...),
    discount_percent: int = Form(...),
    active: bool = Form(True),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    code = code.upper().strip()
    if db.query(PromoCode).filter(PromoCode.code == code).first():
        raise HTTPException(status_code=409, detail="Promo code already exists")
    if not 1 <= discount_percent <= 90:
        raise HTTPException(status_code=400, detail="Discount must be between 1 and 90")
    promo = PromoCode(code=code, discount_percent=discount_percent, active=active)
    db.add(promo)
    db.commit()
    return {"message": "Promo code created", "code": promo.code}


@router.delete("/promos/{promo_id}", status_code=204)
def delete_promo(
    promo_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    promo = db.get(PromoCode, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")
    db.delete(promo)
    db.commit()


# ---------- Sliders ----------

@router.get("/sliders")
def list_sliders(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    return db.query(Slider).order_by(Slider.id.desc()).all()


@router.post("/sliders", status_code=201)
def create_slider(
    title: str = Form(...),
    button_text: str = Form("SHOP NOW"),
    button_link: str = Form("#"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    image = save_upload(file, "sliders")
    slider = Slider(title=title, button_text=button_text, button_link=button_link, image=image)
    db.add(slider)
    db.commit()
    return {"message": "Slider created", "id": slider.id, "image": image}


@router.delete("/sliders/{slider_id}", status_code=204)
def delete_slider(
    slider_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    slider = db.get(Slider, slider_id)
    if not slider:
        raise HTTPException(status_code=404, detail="Slider not found")
    delete_upload(slider.image)
    db.delete(slider)
    db.commit()


# ---------- Contact messages ----------

@router.get("/contacts")
def list_contacts(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    return db.query(Contact).order_by(Contact.created_at.desc()).all()


@router.delete("/contacts/{contact_id}", status_code=204)
def delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    contact = db.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Message not found")
    db.delete(contact)
    db.commit()

@router.get("/agent-runs")
def agent_runs(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
    agent: str | None = None,
    limit: int = Query(50, ge=1, le=200),
):
    query = db.query(AgentRun)
    if agent:
        query = query.filter(AgentRun.agent == agent)
    return query.order_by(AgentRun.id.desc()).limit(limit).all()
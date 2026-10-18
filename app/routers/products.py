from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product, Category

router = APIRouter()


@router.get("")
def list_products(
    db: Session = Depends(get_db),
    category: Category | None = None,
    search: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    sort: str = Query("newest", pattern="^(newest|price_low|price_high|name)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
):
    query = db.query(Product).filter(Product.is_active == True)
    if category:
        query = query.filter(Product.category == category)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(term),
                Product.description.ilike(term),
                Product.seo_tags.ilike(term),
            )
        )
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    total = query.count()
    sort_map = {
        "newest": Product.created_at.desc(),
        "price_low": Product.price.asc(),
        "price_high": Product.price.desc(),
        "name": Product.name.asc(),
    }
    items = (
        query.order_by(sort_map[sort])
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "items": items,
    }


@router.get("/{slug}")
def product_detail(slug: str, db: Session = Depends(get_db)):
    product = (
        db.query(Product)
        .filter(Product.slug == slug, Product.is_active == True)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product
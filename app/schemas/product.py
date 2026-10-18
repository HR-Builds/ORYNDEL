from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel
from app.models import Category


class ProductCreate(BaseModel):
    name: str
    category: Category
    price: Decimal
    stock: int = 0
    description: str | None = None
    seo_tags: str | None = None
    is_active: bool = True


class ProductOut(BaseModel):
    id: int
    name: str
    slug: str
    category: Category
    price: Decimal
    stock: int
    description: str | None
    image: str | None
    seo_tags: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
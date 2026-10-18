from decimal import Decimal
from pydantic import BaseModel
from app.schemas.product import ProductOut


class CartAdd(BaseModel):
    product_id: int
    quantity: int = 1


class CartItemUpdate(BaseModel):
    quantity: int


class CartItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    product: ProductOut

    class Config:
        from_attributes = True


class CartOut(BaseModel):
    items: list[CartItemOut]
    total: Decimal
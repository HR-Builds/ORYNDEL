from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, EmailStr
from app.models import PaymentMethod, OrderStatus


class OrderItemOut(BaseModel):
    product_id: int | None
    product_name: str
    price: Decimal
    quantity: int
    image: str | None

    class Config:
        from_attributes = True


class CheckoutRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str
    address: str
    city: str
    postal_code: str
    country: str
    landmark: str | None = None
    payment_method: PaymentMethod
    promo_code: str | None = None


class OrderOut(BaseModel):
    id: int
    order_number: str
    first_name: str
    last_name: str
    email: str
    phone_number: str
    address: str
    city: str
    postal_code: str
    country: str
    landmark: str | None
    payment_method: PaymentMethod
    payment_screenshot: str | None
    status: OrderStatus
    fraud_flag: bool
    promo_code: str | None
    total_amount: Decimal
    created_at: datetime
    items: list[OrderItemOut]

    class Config:
        from_attributes = True
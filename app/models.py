import re
import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Numeric, DateTime, Boolean, ForeignKey,
    Enum as SAEnum, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.database import Base


def slugify(text: str) -> str:
    text = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[-\s]+", "-", text).strip("-")


class Category(str, enum.Enum):
    clothing = "clothing"
    footwear = "footwear"
    accessories = "accessories"
    fragrance = "fragrance"
    cosmetics = "cosmetics"


class PaymentMethod(str, enum.Enum):
    bank_transfer = "bank_transfer"
    cod = "cod"


class OrderStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"
    refunded = "refunded"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(150), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=False)          # activated via email OTP
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    cart_items = relationship("CartItem", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user")


class EmailOTP(Base):
    __tablename__ = "email_otps"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), nullable=False, index=True)
    otp_hash = Column(String(255), nullable=False)
    purpose = Column(String(50), nullable=False)  # verify_email | reset_password
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    slug = Column(String(220), unique=True, nullable=False, index=True)
    category = Column(SAEnum(Category), nullable=False, index=True)
    price = Column(Numeric(10, 2), nullable=False)
    stock = Column(Integer, default=0)
    description = Column(Text, nullable=True)
    image = Column(String(500), nullable=True)      # path under /uploads
    seo_tags = Column(String(500), nullable=True)   # comma separated
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_cart_user_product"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, default=1)

    user = relationship("User", back_populates="cart_items")
    product = relationship("Product")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    order_number = Column(String(20), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)
    phone_number = Column(String(20), nullable=False)
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    postal_code = Column(String(20), nullable=False)
    country = Column(String(100), nullable=False)
    landmark = Column(String(255), nullable=True)

    payment_method = Column(SAEnum(PaymentMethod), default=PaymentMethod.cod)
    payment_screenshot = Column(String(500), nullable=True)  # bank transfer proof

    status = Column(SAEnum(OrderStatus), default=OrderStatus.pending)
    fraud_score = Column(Integer, default=0)   # Agent 4 writes here
    fraud_flag = Column(Boolean, default=False)
    promo_code = Column(String(50), nullable=True)
    total_amount = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    product_name = Column(String(255), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, nullable=False)
    image = Column(String(500), nullable=True)

    order = relationship("Order", back_populates="items")


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    discount_percent = Column(Integer, default=0)
    active = Column(Boolean, default=True)
    expiry_date = Column(DateTime, nullable=True)


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    number = Column(String(20), nullable=False)
    email = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Slider(Base):
    __tablename__ = "sliders"

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    button_text = Column(String(50), default="SHOP NOW")
    button_link = Column(String(255), default="#")
    image = Column(String(500), nullable=False)
    is_active = Column(Boolean, default=True)

class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(Integer, primary_key=True)
    agent = Column(String(50), nullable=False)   # refund | recommendations | pricing | fraud | onboarding
    task = Column(String(255), nullable=False)
    status = Column(String(30), default="running")  # running | success | failed | awaiting_review
    result = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
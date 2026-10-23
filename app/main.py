
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.config import settings
from app.routers import auth, products, cart, checkout, orders, admin, contact
from app.ratelimit import limiter
from app.middleware.security import SecurityHeadersMiddleware
from app.routers import agents as agents_router

app = FastAPI(title="ORYNDEL API", version="1.0.0")

app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler,
)

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(cart.router, prefix="/api/cart", tags=["cart"])
app.include_router(checkout.router, prefix="/api/checkout", tags=["checkout"])
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(agents_router.router, tags=["agents"])
app.include_router(agents_router.router, prefix="/api", tags=["agents"])

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=settings.UPLOAD_DIR),
    name="uploads",
)


@app.get("/health")
def health():
    return {"status": "ok", "brand": "ORYNDEL"}
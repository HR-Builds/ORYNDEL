from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.auth import UserCreate, UserOut, Token
from app.security import hash_password, verify_password, create_access_token
from app.ratelimit import limiter

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(
    request: Request,
    data: UserCreate,
    db: Session = Depends(get_db),
):
    email = data.email.lower()

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=409,
            detail="Email already registered",
        )

    user = User(
        email=email,
        username=data.username,
        hashed_password=hash_password(data.password),
        is_active=True,
    )

    db.add(user)
    db.commit()

    return {
        "message": "Account created successfully. You can now log in."
    }


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(
    request: Request,
    data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(
        User.email == data.username.lower()
    ).first()

    if not user or not verify_password(
        data.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Your account is inactive. Contact the administrator.",
        )

    return Token(
        access_token=create_access_token(user.id, user.is_admin)
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
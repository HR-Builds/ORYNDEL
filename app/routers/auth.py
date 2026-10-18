from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models import User
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.auth import (
    UserCreate,
    UserOut,
    LoginRequest,
    Token,
    EmailRequest,
    VerifyEmailRequest,
    ResendOTPRequest,
    ResetPasswordRequest,
)
from app.security import hash_password, verify_password, create_access_token
from app.services.otp import create_otp, verify_otp
from app.services.email import send_otp_email
from app.ratelimit import limiter

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, data: UserCreate, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=email,
        username=data.username,
        hashed_password=hash_password(data.password),
        is_active=False,
    )
    db.add(user)
    db.commit()

    otp = create_otp(db, email, "verify_email")
    await send_otp_email(email, otp, "verify_email")
    return {"message": "Account created. Check your email for the verification code."}


@router.post("/verify-email")
def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    if not verify_otp(db, data.email, data.otp, "verify_email"):
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True
    db.commit()
    return {"message": "Email verified. You can now log in."}


@router.post("/resend-otp")
async def resend_otp(data: ResendOTPRequest, db: Session = Depends(get_db)):
    if data.purpose not in ("verify_email", "reset_password"):
        raise HTTPException(status_code=400, detail="Invalid purpose")

    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp = create_otp(db, data.email, data.purpose)
    await send_otp_email(data.email, otp, data.purpose)
    return {"message": "A new code has been sent to your email."}


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

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Verify your email before logging in")

    return Token(access_token=create_access_token(user.id, user.is_admin))


@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    data: EmailRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp = create_otp(db, data.email, "reset_password")
    await send_otp_email(data.email, otp, "reset_password")
    return {"message": "If the email exists, a reset code has been sent."}


@router.post("/reset-password")
@limiter.limit("10/minute")
def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    if not verify_otp(db, data.email, data.otp, "reset_password"):
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Password updated. Log in with your new password."}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user

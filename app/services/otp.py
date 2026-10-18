import hashlib
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import EmailOTP

OTP_EXPIRY_MINUTES = 10


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def create_otp(db: Session, email: str, purpose: str) -> str:
    otp = f"{random.randint(100000, 999999)}"
    db.add(
        EmailOTP(
            email=email.lower(),
            otp_hash=_hash(otp),
            purpose=purpose,
            expires_at=datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES),
        )
    )
    db.commit()
    return otp


def verify_otp(db: Session, email: str, otp: str, purpose: str) -> bool:
    record = (
        db.query(EmailOTP)
        .filter(
            EmailOTP.email == email.lower(),
            EmailOTP.purpose == purpose,
            EmailOTP.used == False,
        )
        .order_by(EmailOTP.id.desc())
        .first()
    )
    if not record or record.expires_at < datetime.utcnow():
        return False
    if record.otp_hash != _hash(otp):
        return False
    record.used = True
    db.commit()
    return True
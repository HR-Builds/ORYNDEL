import os
from app.database import SessionLocal
from app.models import User
from app.security import hash_password


def main():
    email = os.getenv("ADMIN_EMAIL", "dev.hassanrashid@gmail.com").lower()
    username = os.getenv("ADMIN_USERNAME", "ORYNDEL Admin")
    password = os.getenv("ADMIN_PASSWORD", "admin123456")

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            print(f"Admin already exists: {email}")
            return
        admin = User(
            email=email,
            username=username,
            hashed_password=hash_password(password),
            is_active=True,
            is_admin=True,
        )
        db.add(admin)
        db.commit()
        print(f"Admin created: {email}")
        print("Change this password before deploying to production.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
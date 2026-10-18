import os
import uuid
from fastapi import HTTPException, UploadFile
from app.config import settings

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def save_upload(file: UploadFile, subfolder: str) -> str:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only JPG, PNG or WEBP images are allowed")
    folder = os.path.join(settings.UPLOAD_DIR, subfolder)
    os.makedirs(folder, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    with open(os.path.join(folder, filename), "wb") as f:
        f.write(file.file.read())
    return f"/uploads/{subfolder}/{filename}"


def delete_upload(path: str | None) -> None:
    if not path or not path.startswith("/uploads/"):
        return
    full_path = os.path.join(settings.UPLOAD_DIR, path.removeprefix("/uploads/"))
    if os.path.exists(full_path):
        os.remove(full_path)
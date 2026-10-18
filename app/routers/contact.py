from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Contact
from pydantic import BaseModel

router = APIRouter()


class ContactCreate(BaseModel):
    first_name: str
    last_name: str
    number: str
    email: str
    message: str


@router.post("", status_code=201)
def submit_contact(data: ContactCreate, db: Session = Depends(get_db)):
    db.add(Contact(**data.model_dump()))
    db.commit()
    return {"message": "Message received. We will get back to you soon."}
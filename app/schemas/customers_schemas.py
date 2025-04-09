from pydantic import BaseModel
from typing import Optional
from app.schemas.base_schema import BaseSchema

class BaseCustomer(BaseSchema):
    name: str
    email: str
    phone: str
    store_id: str

class CustomerCreate(BaseModel):
    name: str
    email: str
    phone: str
    store_id: str

    class Config:
        orm_mode = True

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        orm_mode = True
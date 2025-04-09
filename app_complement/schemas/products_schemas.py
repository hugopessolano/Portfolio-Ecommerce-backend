from pydantic import BaseModel
from typing import Optional
from .base_schema import BaseSchema

class BaseProduct(BaseSchema):
    name: str
    price: float
    stock: int
    store_id: str

    class Config:
        orm_mode = True

class ProductCreate(BaseModel):
    name: str
    price: float
    stock: int
    store_id: str
    class Config:
        orm_mode = True

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None

    class Config:
        orm_mode = True
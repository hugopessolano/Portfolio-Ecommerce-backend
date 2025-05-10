from pydantic import BaseModel
from typing import List, Optional
from app.schemas.customers_schemas import BaseCustomer
from app.schemas.base_schema import BaseSchema


class BaseOrderProduct(BaseSchema):
    product_id: str
    price: float
    quantity: int
    name: str

class BaseOrder(BaseSchema):
    store_id: str
    customer: BaseCustomer
    total: float
    order_products: List[BaseOrderProduct]


class OrderProductCreate(BaseModel):
    product_id: str
    quantity: int

    class Config:
        orm_mode = True

class OrderCustomerCreate(BaseModel):
    name: str
    email: str
    phone: str

    class Config:
        orm_mode = True

class OrderCreate(BaseModel):
    store_id: str
    customer_id: Optional[str] = None
    new_customer_data: Optional[OrderCustomerCreate] = None
    order_products: List[OrderProductCreate]

    class Config:
        orm_mode = True


class OrderUpdate(BaseModel):
    customer_id: Optional[str] = None
    total: Optional[float] = None
    status: Optional[str] = None
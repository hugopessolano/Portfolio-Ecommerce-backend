from pydantic import BaseModel
from app.schemas.base_schema import BaseSchema
from typing import Optional

class BaseLead(BaseSchema):
    id:str
    store_id:str
    customer_id:str
    product_id:str
    order_id:Optional[str] = None
    product_quantity:int

class LeadCreate(BaseModel):
    store_id:str
    customer_id:str
    product_id:str
    order_id:Optional[str] = None
    product_quantity:int
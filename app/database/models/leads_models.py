from sqlalchemy import String, Integer
from .base_models import Base
from sqlalchemy.orm import Mapped, relationship, mapped_column
from sqlalchemy import ForeignKey
import uuid

class Leads(Base):
    __tablename__ = "leads"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    store_id: Mapped[str] = mapped_column(String, ForeignKey('stores.id'), nullable=False)
    customer_id: Mapped[str] = mapped_column(String, ForeignKey('customers.id'), nullable=False)
    product_id: Mapped[str] = mapped_column(String, ForeignKey('products.id'), nullable=False)
    order_id: Mapped[str] = mapped_column(String, ForeignKey('orders.id'))
    
    product_quantity: Mapped[Integer] = mapped_column(Integer, nullable=False)

    store = relationship("Stores", back_populates="leads")
    order = relationship("Orders", back_populates="leads")
    customer = relationship("Customers", back_populates="leads")
    product = relationship("Products", back_populates="leads")
    

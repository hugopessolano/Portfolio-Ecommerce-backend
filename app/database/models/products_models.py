import uuid
from sqlalchemy.orm import Mapped, relationship, mapped_column
from sqlalchemy import Column, String, Float, Integer, ForeignKey
from .base_models import Base
from typing import List

class Products(Base):
    __tablename__ = 'products'
    __table_args__ = {'extend_existing': True}
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String)
    price: Mapped[Float] = mapped_column(Float)
    stock: Mapped[Integer] = mapped_column(Integer)
    store_id = Column(String, ForeignKey("stores.id"), nullable=False)
    
    store = relationship("Stores", back_populates="products")
    leads:Mapped[List['Leads']] = relationship("Leads", back_populates="product")



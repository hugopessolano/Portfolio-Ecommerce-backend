import uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Column, ForeignKey, String
from typing import List
from .base_models import Base

class Customers(Base):
    __tablename__ = 'customers'
    __table_args__ = {'extend_existing': True}
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String)
    phone: Mapped[str] = mapped_column(String)
    store_id = Column(String, ForeignKey("stores.id"), nullable=False)
    
    store = relationship("Stores", back_populates="customers")
    orders:Mapped[List['Orders']] = relationship('Orders', back_populates='customer')
    leads:Mapped[List['Leads']] = relationship('Leads', back_populates='customer')
    

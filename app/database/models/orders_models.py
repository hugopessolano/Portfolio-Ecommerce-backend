import uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Float, Integer, Column
from typing import List
from .base_models import Base


class OrderProducts(Base):
    __tablename__ = 'order_products'
    __table_args__ = {'extend_existing': True}
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id: Mapped[str] = mapped_column(String, ForeignKey('orders.id'))
    product_id: Mapped[str] = mapped_column(String, ForeignKey('products.id'))

    price: Mapped[Float] = mapped_column(Float)
    quantity: Mapped[Integer] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String)

    order: Mapped['Orders'] = relationship('Orders', back_populates='order_products')
    product: Mapped['Products'] = relationship('Products')


class Orders(Base):
    __tablename__ = 'orders'
    __table_args__ = {'extend_existing': True}
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id: Mapped[str] = mapped_column(String, ForeignKey('customers.id'))
    store_id = Column(String, ForeignKey("stores.id"), nullable=False)
    
    
    total: Mapped[Float] = mapped_column(Float)

    store = relationship("Stores", back_populates="orders")
    customer: Mapped['Customers'] = relationship('Customers', back_populates='orders')
    order_products: Mapped[List['OrderProducts']] = relationship('OrderProducts', back_populates='order')
    leads:Mapped[List['Leads']] = relationship("Leads", back_populates="order")
from fastapi import HTTPException
from app.database.models import Customers, Products, OrderProducts
from app.schemas.orders_schemas import OrderCreate
from sqlalchemy.orm import Session


def order_validate_customer(order:OrderCreate, db:Session) -> Customers:
    if order.customer_id:
        customer = db.query(Customers).filter(Customers.id == order.customer_id, Customers.store_id == order.store_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail='Customer not found')
        return customer
    elif order.new_customer_data:
        customer = Customers(**order.new_customer_data.model_dump(), store_id=order.store_id)
        db.add(customer)
        return customer
    else:
        raise HTTPException(status_code=400, detail='Either customer_id or new_customer_data must be provided')
    

def order_validate_products(order:OrderCreate, db:Session) -> list[OrderProducts]:
    order_products = []

    for order_product in order.order_products:
        product = db.query(Products).filter(Products.id == order_product.product_id, Products.store_id == order.store_id).first()
        if not product:
            raise HTTPException(status_code=404, detail='Product not found')
        
        order_products.append(OrderProducts(**order_product.model_dump(), price=product.price, name=product.name))
    
    return order_products

def order_products_validate_stock(order_products:list[OrderProducts]) -> bool:
    for order_product in order_products:
        product:Products = order_product.product
        if product.stock < order_product.quantity: 
                raise HTTPException(status_code=400, detail=f'Insufficient stock for product: {product.name}')

def order_calculate_total(order_products:list[OrderProducts]) -> float:
    total = 0
    for order_product in order_products:
        total += order_product.price * order_product.quantity
    return total
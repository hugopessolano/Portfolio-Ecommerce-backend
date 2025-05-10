from fastapi import HTTPException
from app.database.models import Customers, Products, OrderProducts, Leads
from app.schemas.orders_schemas import OrderCreate
from app.schemas.leads_schemas import LeadCreate
from sqlalchemy.orm import Session
from typing import Tuple, List

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
    

def order_validate_products(order:OrderCreate, db:Session) -> Tuple[List[OrderProducts],List[Products]]:
    order_products = []
    products = []

    for order_product in order.order_products:
        product = db.query(Products).filter(Products.id == order_product.product_id, Products.store_id == order.store_id).first()
        if not product:
            raise HTTPException(status_code=404, detail='Product not found')
        products.append(product)
        order_products.append(OrderProducts(**order_product.model_dump(), price=product.price, name=product.name))
    
    return order_products, products

def order_products_validate_stock(order:OrderCreate, order_products:list[OrderProducts], products:list[Products]) -> Tuple[List[OrderProducts], List[LeadCreate]]:
    available_products, leads = list(), list()
    for order_product, product in zip(order_products, products):
        if product.stock < order_product.quantity: 
                #raise HTTPException(status_code=400, detail=f'Insufficient stock for product: {product.name}')
                lead_product_quantity = order_product.quantity - product.stock
                order_product.quantity = product.stock   
                leads.append(LeadCreate(store_id=product.store_id, 
                                        customer_id=order.customer_id, 
                                        product_id=product.id, 
                                        product_quantity=lead_product_quantity)
                                        )
        
        available_products.append(order_product) if order_product.quantity > 0 else None
        product.stock -= order_product.quantity #Listo para separar logica de descuento de stock
    return available_products, leads

                
 
def order_calculate_total(order_products:list[OrderProducts]) -> float:
    total = 0
    for order_product in order_products:
        total += order_product.price * order_product.quantity
    return total
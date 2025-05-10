from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.auth.oauth2 import get_current_user
from app.routers.utils import filter_by_store, calculate_next_and_last_pages, order_by_parameter
from app.database.models import Orders, Users, Leads
from app.schemas.orders_schemas import BaseOrder, OrderCreate
from typing import List, Literal
from app.routers.orders_utils import order_validate_customer, order_validate_products, order_products_validate_stock, order_calculate_total

router = APIRouter(
    prefix='/orders',
    tags=['Orders'] #Divisor para la documentacion
)


SORTABLE_FIELDS_ORDERS = {
    "total": Orders.total,
    "created_at": Orders.created_at,
    "updated_at": Orders.updated_at,
}

@router.get('', response_model=List[BaseOrder])
def get_orders(
    request: Request,
    response: Response, 
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of items per page"),
    order_by: str = Query("created_at", description=f"Field to sort by. Allowed fields: {', '.join(SORTABLE_FIELDS_ORDERS.keys())}"), 
    order_dir: Literal['asc', 'desc'] = Query("desc", description="Sort direction (asc/desc)") 
):
    offset = (page - 1) * page_size
    orders_query = db.query(Orders)
    if not user.cross_store_allowed:
        orders_query = filter_by_store(orders_query, Orders, user)
    
    calculate_next_and_last_pages(orders_query, page_size, page, request, response)
    orders_query = order_by_parameter(order_by, order_dir, SORTABLE_FIELDS_ORDERS, orders_query)

    orders = orders_query.offset(offset).limit(page_size).all()

    return orders


@router.get('/store/{store_id}', response_model=List[BaseOrder])
def get_store_orders(
    request: Request,
    response: Response, 
    store_id: str,
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of items per page"),
    order_by: str = Query("created_at", description=f"Field to sort by. Allowed fields: {', '.join(SORTABLE_FIELDS_ORDERS.keys())}"), 
    order_dir: Literal['asc', 'desc'] = Query("desc", description="Sort direction (asc/desc)") 
):
    offset = (page - 1) * page_size
    orders_query = db.query(Orders).filter(Orders.store_id == store_id)
    if not user.cross_store_allowed:
        orders_query = filter_by_store(orders_query, Orders, user)

    calculate_next_and_last_pages(orders_query, page_size, page, request, response)
    orders_query = order_by_parameter(order_by, order_dir, SORTABLE_FIELDS_ORDERS, orders_query)

    orders = orders_query.offset(offset).limit(page_size).all()
    
    return orders


@router.get('/{order_id}', response_model=BaseOrder)
def get_order(order_id: str, 
              db: Session = Depends(get_db),
              user: Users = Depends(get_current_user)
              ):
    order_query = db.query(Orders).filter(Orders.id == order_id)
    if not user.cross_store_allowed:
        order_query = filter_by_store(order_query, Orders, user)
    
    order = order_query.first()

    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    return order


@router.post('', response_model=BaseOrder)
def create_order(order: OrderCreate, 
                 db: Session = Depends(get_db),
                 user: Users = Depends(get_current_user)
                 ):
    if not order.store_id in [store.id for store in user.stores] and not user.cross_store_allowed:
        raise HTTPException(status_code=403, detail=f'User is not allowed to create orders in store {order.store_id}')
    
    customer = order_validate_customer(order, db)
    order_products, products = order_validate_products(order, db)
    available_products, leads = order_products_validate_stock(order, order_products, products)
    
    if len(available_products) == 0:
        raise HTTPException(status_code=400, detail='No products available')
    
    calculated_total = order_calculate_total(available_products)
    
    new_order = Orders(store_id=order.store_id, customer=customer, total=calculated_total, order_products=available_products)
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    if len(leads) > 0:
        for lead in leads:
            lead.order_id = new_order.id
            new_lead = Leads(**lead.model_dump())
            db.add(new_lead)
        db.commit()

    return new_order
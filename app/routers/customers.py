from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.auth.oauth2 import get_current_user
from app.database.models import Customers, Users, Orders
from app.schemas.customers_schemas import BaseCustomer, CustomerCreate, CustomerUpdate
from app.routers.utils import filter_by_store, calculate_next_and_last_pages, order_by_parameter
from typing import Literal

router = APIRouter(
    prefix='/customers',
    tags=['Customers'] #Divisor para la documentacion
)


SORTABLE_FIELDS_CUSTOMERS = {
    "name": Customers.name,
    "email": Customers.email,
    "phone": Customers.phone,
    "created_at": Customers.created_at,
    "updated_at": Customers.updated_at,
}

@router.get("", response_model=list[BaseCustomer], status_code=200, summary="Get all customers")
async def get_customers(
    request: Request,
    response: Response, 
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of items per page"),
    order_by: str = Query("created_at", description=f"Field to sort by. Allowed fields: {', '.join(SORTABLE_FIELDS_CUSTOMERS.keys())}"), 
    order_dir: Literal['asc', 'desc'] = Query("desc", description="Sort direction (asc/desc)") 
):
    offset = (page - 1) * page_size
    customers_query = db.query(Customers)
    
    if not user.cross_store_allowed:
        customers_query = filter_by_store(customers_query, Customers, user)

    customers_query = order_by_parameter(order_by, order_dir, SORTABLE_FIELDS_CUSTOMERS, customers_query)

    calculate_next_and_last_pages(customers_query, page_size, page, request, response)

    customers = customers_query.offset(offset).limit(page_size).all()
    return customers


@router.get("/store/{store_id}", response_model=list[BaseCustomer], status_code=200, summary="Get all customers for a certain store")
async def get_store_customers(
    request: Request,
    response: Response, 
    store_id: str,
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of items per page"),
    order_by: str = Query("created_at", description=f"Field to sort by. Allowed fields: {', '.join(SORTABLE_FIELDS_CUSTOMERS.keys())}"), 
    order_dir: Literal['asc', 'desc'] = Query("desc", description="Sort direction (asc/desc)") 
):
    offset = (page - 1) * page_size
    customers_query = db.query(Customers).filter(Customers.store_id == store_id)
    
    if not user.cross_store_allowed:
        customers_query = filter_by_store(customers_query, Customers, user)
    
    customers_query = order_by_parameter(order_by, order_dir, SORTABLE_FIELDS_CUSTOMERS, customers_query)
    calculate_next_and_last_pages(customers_query, page_size, page, request, response)
    
    customers = customers_query.offset(offset).limit(page_size).all()
    return customers

@router.get("/{customer_id}", response_model=BaseCustomer, status_code=200, summary="Get a customer")
async def get_customer(customer_id: str, 
                       db:Session = Depends(get_db),
                       user: Users = Depends(get_current_user)
                       ):
    
    customer_query = db.query(Customers).filter(Customers.id == customer_id)
    if not user.cross_store_allowed:
        customer_query = filter_by_store(customer_query, Customers, user)
    
    customer = customer_query.first()
    
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.post("", response_model=BaseCustomer, status_code=201, summary="Create a customer")
async def create_customer(customer: CustomerCreate, 
                          db:Session = Depends(get_db),
                          user: Users = Depends(get_current_user)
                          ):

    if not customer.store_id in [store.id for store in user.stores] and not user.cross_store_allowed:
        raise HTTPException(status_code=403, detail=f'User is not allowed to create Customers in store {customer.store_id}')
    
    new_customer = Customers(**customer.model_dump())
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return new_customer

@router.put("/{customer_id}", response_model=BaseCustomer, status_code=200, summary="Update a customer")
async def update_customer(customer_id: str, 
                          customer: CustomerUpdate, 
                          db:Session = Depends(get_db),
                          user: Users = Depends(get_current_user)
                          ):
    customer_query = db.query(Customers).filter(Customers.id == customer_id)

    if not user.cross_store_allowed:
        customer_query = filter_by_store(customer_query, Customers, user)

    customer_model = customer_query.first()

    if customer_model is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    for key, value in customer.model_dump().items():
        if value is not None:
            setattr(customer_model, key, value)

    db.commit()
    db.refresh(customer_model)
    return customer_model

@router.delete("/{customer_id}", status_code=204, summary="Delete a customer")
async def delete_customer(customer_id: str, 
                          db:Session = Depends(get_db),
                          user: Users = Depends(get_current_user)
                          ):
    customer_query = db.query(Customers).filter(Customers.id == customer_id)

    if not user.cross_store_allowed:
        customer_query = filter_by_store(customer_query, Customers, user)

    customer = customer_query.first()

    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    existing_orders = db.query(Orders).filter(Orders.customer_id == customer_id).first()
    
    if existing_orders:
        raise HTTPException(
            status_code=409, # 409 Conflict es una buena opción semántica
            detail=f"Cannot delete customer {customer_id}. They have associated orders. Please delete or reassign orders first."
        )
    db.delete(customer)
    db.commit()
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import Stores, Users, UserStores
from app.schemas.stores_schemas import BaseStore, StoreCreate, StoreUpdate
from app.routers.utils import filter_by_store, calculate_next_and_last_pages, order_by_parameter
from app.auth.oauth2 import get_current_user
from typing import List, Literal

router = APIRouter(
    prefix='/stores',
    tags=['Stores']
)

SORTABLE_FIELDS_STORES = {
    "name": Stores.name,
    "address": Stores.address,
    "created_at": Stores.created_at,
    "updated_at": Stores.updated_at,
}

@router.get("", response_model=List[BaseStore])
async def get_stores(
    request: Request,
    response: Response, 
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    order_by: str = Query("created_at", description=f"Field to sort by. Allowed fields: {', '.join(SORTABLE_FIELDS_STORES.keys())}"), 
    order_dir: Literal['asc', 'desc'] = Query("desc", description="Sort direction (asc/desc)") 
):
    offset = (page - 1) * page_size
    stores_query = db.query(Stores)
    
    if not user.cross_store_allowed:
        stores_query = filter_by_store(stores_query, Stores, user)
    
    calculate_next_and_last_pages(stores_query, page_size, page, request, response)
    stores_query = order_by_parameter(order_by, order_dir, SORTABLE_FIELDS_STORES, stores_query)

    stores = stores_query.offset(offset).limit(page_size).all()

    return stores

@router.post("", response_model=BaseStore)
async def create_store(store: StoreCreate, 
                       db: Session = Depends(get_db),
                       user: Users = Depends(get_current_user)
                       ):
    new_store = Stores(**store.model_dump())
    db.add(new_store)
    db.commit()
    db.refresh(new_store)
    # Add the new store to the user's allowed stores
    user_store = UserStores(user_id=user.id, store_id=new_store.id)
    db.add(user_store)
    db.commit()
    return new_store

@router.put("/{store_id}", response_model=BaseStore)
async def update_store(store_id: str, 
                       store: StoreUpdate, 
                       db: Session = Depends(get_db),
                       user: Users = Depends(get_current_user)
                       ):
    existing_store_query = db.query(Stores).filter(Stores.id == store_id)
    if not user.cross_store_allowed:
        existing_store_query = filter_by_store(existing_store_query, Stores, user)
        
    existing_store = existing_store_query.first()

    if not existing_store:
        raise HTTPException(status_code=404, detail="Store not found")
    for key, value in store.model_dump(exclude_unset=True).items():
        setattr(existing_store, key, value)
    db.commit()
    db.refresh(existing_store)
    return existing_store

@router.delete("/{store_id}")
async def delete_store(store_id: str, 
                       db: Session = Depends(get_db),
                       user: Users = Depends(get_current_user)
                       ):
    existing_store_query = db.query(Stores).filter(Stores.id == store_id)
    
    if not user.cross_store_allowed:
        existing_store_query = filter_by_store(existing_store_query, Stores, user)
        
    existing_store = existing_store_query.first()
    
    if not existing_store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    db.delete(existing_store)
    db.commit()

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import Products, Users
from app.schemas.products_schemas import BaseProduct, ProductCreate, ProductUpdate
from typing import List
from app.auth.oauth2 import get_current_user
from app.routers.utils import filter_by_store

router = APIRouter(
    prefix='/products',
    tags=['Products'] #Divisor para la documentacion
)



@router.get("", response_model=list[BaseProduct], status_code=200, summary="Get all products")
async def get_products(
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of items per page")
):
    offset = (page - 1) * page_size
    products_query = db.query(Products)
    
    if not user.cross_store_allowed:
        products_query = filter_by_store(products_query, Products, user)
    
    products = products_query.offset(offset).limit(page_size).all()
    return products

@router.get("/store/{store_id}", response_model=list[BaseProduct], status_code=200, summary="Get all products for a store")
async def get_store_products(
    store_id:str,
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of items per page")
):
    offset = (page - 1) * page_size

    products_query = db.query(Products).filter(Products.store_id == store_id)
    
    if not user.cross_store_allowed:
        products_query = filter_by_store(products_query, Products, user)
    
    
    products = products_query.offset(offset).limit(page_size).all()
    return products

@router.get("/{product_id}", response_model=BaseProduct, status_code=200, summary="Get a product")
async def get_product(  product_id: str, 
                        db:Session = Depends(get_db),
                        user: Users = Depends(get_current_user)):
    product_query = db.query(Products).filter(Products.id == product_id)
    
    if not user.cross_store_allowed:
        product_query = filter_by_store(product_query, Products, user)

    product = product_query.first()

    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.post("", response_model=BaseProduct, status_code=201, summary="Create a product")
async def create_product(product: ProductCreate, 
                         db:Session = Depends(get_db),
                         user: Users = Depends(get_current_user)
                         ):
    if not product.store_id in [store.id for store in user.stores] and not user.cross_store_allowed:
        raise HTTPException(status_code=403, detail=f'User is not allowed to create products in store {product.store_id}')
        
    new_product = Products(**product.model_dump())
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@router.put("/{product_id}", response_model=BaseProduct, status_code=200, summary="Update a product")
async def update_product(product_id: str, 
                         product: ProductUpdate, 
                         db:Session = Depends(get_db),
                         user: Users = Depends(get_current_user)
                         ):
    product_model_query = db.query(Products)
    if not user.cross_store_allowed:
        product_model_query  = filter_by_store(product_model_query , Products, user)
    
    product_model = product_model_query.filter(Products.id == product_id).first()
    
    if product_model is None:
        raise HTTPException(status_code=404, detail="Product not found")
    
    for key, value in product.model_dump().items():
        if value is not None:
            setattr(product_model, key, value)

    db.commit()
    db.refresh(product_model)
    return product_model

@router.delete("/{product_id}", status_code=204, summary="Delete a product")
async def delete_product(product_id: str, 
                         db:Session = Depends(get_db),
                         user: Users = Depends(get_current_user)
                         ):
    product_query = db.query(Products)
    if not user.cross_store_allowed:
        product_query = filter_by_store(product_query, Products, user)

    product = product_query.filter(Products.id == product_id).first()
    
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()
    return



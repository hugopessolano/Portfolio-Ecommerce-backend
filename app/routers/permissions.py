from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import Permissions, Users
from app.auth.oauth2 import get_current_user
from app.schemas.users_schemas import BasePermission, PermissionCreate, PermissiontUpdate
from typing import List

router = APIRouter(
    prefix='/permissions',
    tags=['Permissions']
)

@router.get("", response_model=List[BasePermission])
async def get_permissions(
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    offset = (page - 1) * page_size
    permissions = db.query(Permissions).offset(offset).limit(page_size).all()
    return permissions

@router.get("/{permission_id}", response_model=BasePermission)
async def get_permission(
    permission_id: str,
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user)

):
    permission = db.query(Permissions).filter(Permissions.id == permission_id).first()
    return permission

@router.post("", response_model=BasePermission)
async def create_permission(permission: PermissionCreate, 
                            db: Session = Depends(get_db),
                            user: Users = Depends(get_current_user)
                            ):
    new_permission = Permissions(**permission.model_dump())
    db.add(new_permission)
    db.commit()
    db.refresh(new_permission)
    return new_permission

@router.put("/{permission_id}", response_model=BasePermission)
async def update_permission(permission_id: str, 
                            permission: PermissiontUpdate, 
                            db: Session = Depends(get_db),
                            user: Users = Depends(get_current_user)
                            ):
    existing_permission = db.query(Permissions).filter(Permissions.id == permission_id).first()
    if not existing_permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    for key, value in permission.model_dump(exclude_unset=True).items():
        setattr(existing_permission, key, value)
    db.commit()
    db.refresh(existing_permission)
    return existing_permission

@router.delete("/{permission_id}")
async def delete_permission(permission_id: str, 
                            db: Session = Depends(get_db),
                            user: Users = Depends(get_current_user)
                            ):
    existing_permission = db.query(Permissions).filter(Permissions.id == permission_id).first()
    if not existing_permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    db.delete(existing_permission)
    db.commit()

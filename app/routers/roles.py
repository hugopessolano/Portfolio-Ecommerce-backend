from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.database.database import get_db
from app.database.models import Roles, Permissions, RolePermissions, Users
from app.schemas.users_schemas import BaseRole, RoleCreate, RoleUpdate
from typing import List
from app.routers.utils import validate_ids, convert_role_to_baserole, filter_by_store
from app.auth.oauth2 import get_current_user


router = APIRouter(
    prefix='/roles',
    tags=['Roles']
)

@router.get("", response_model=List[BaseRole])
async def get_roles(
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    offset = (page - 1) * page_size
    roles_query = db.query(Roles).options(joinedload(Roles.permissions).joinedload(RolePermissions.permission))

    if not user.cross_store_allowed:
        roles_query = filter_by_store(roles_query, Roles, user)

    roles = roles_query.offset(offset).limit(page_size).all()
    roles_with_permissions = [convert_role_to_baserole(role, db) for role in roles]

    return roles_with_permissions

@router.get("/{role_id}", response_model=BaseRole)
async def get_role(role_id: str, 
                   db: Session = Depends(get_db),
                   user: Users = Depends(get_current_user)
                   ):
    role_query = db.query(Roles).options(joinedload(Roles.permissions).joinedload(RolePermissions.permission)).filter(Roles.id == role_id)

    if not user.cross_store_allowed:
        role_query = filter_by_store(role_query, Roles, user)

    role = role_query.first()

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return convert_role_to_baserole(role, db)

@router.get("/store/{store_id}", response_model = List[BaseRole])
async def get_roles_by_store(
    store_id: str, 
    db: Session = Depends(get_db), 
    user: Users = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    offset = (page - 1) * page_size
    roles_query = db.query(Roles).options(joinedload(Roles.permissions).joinedload(RolePermissions.permission)).filter(Roles.store_id == store_id)

    if not user.cross_store_allowed:
        roles_query = filter_by_store(roles_query, Roles, user)

    roles = roles_query.offset(offset).limit(page_size).all()

    roles_with_permissions = [convert_role_to_baserole(role, db) for role in roles]
    
    return roles_with_permissions

@router.post("", response_model=BaseRole)
async def create_role(role: RoleCreate, 
                      db: Session = Depends(get_db),
                      user: Users = Depends(get_current_user)
                      ):
    invalid_permissions = validate_ids(role.role_permissions,Permissions, db)
    if len(invalid_permissions) > 0:
        raise HTTPException(status_code=404, detail=f"Permission with the following ids were not found: {invalid_permissions}")

    if not role.store_id in [store.id for store in user.stores] and not user.cross_store_allowed:
        raise HTTPException(status_code=403, detail=f'User is not allowed to create Roles in store {role.store_id}')

    new_role = Roles(**role.model_dump(exclude='role_permissions'))
    permissions = list()
    for role_permission in role.role_permissions:
        new_permission = RolePermissions(role_id=new_role.id, permission_id=role_permission)
        db.add(new_permission)
        permissions.append(new_permission)
    new_role.permissions = permissions

    db.add(new_role)
    db.commit()
    db.refresh(new_role)
    return convert_role_to_baserole(new_role, db)

@router.put("/{role_id}", response_model=BaseRole)
async def update_role(role_id: str, 
                      role: RoleUpdate, 
                      db: Session = Depends(get_db),
                      user: Users = Depends(get_current_user)
                      ):
    role_query = db.query(Roles).filter(Roles.id == role_id)
    
    if not user.cross_store_allowed:
        role_query = filter_by_store(role_query, Roles, user)
    
    role_model = role_query.first()

    if not role_model:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if 'role_permissions' in role.model_dump(exclude_unset=True) and role.role_permissions is not None:
      invalid_permissions = validate_ids(role.role_permissions, Permissions, db)
      if len(invalid_permissions) > 0:
        raise HTTPException(status_code=404, detail=f"Permission with the following ids were not found: {invalid_permissions}")
      
      # Delete the previous permissions
      db.query(RolePermissions).filter(RolePermissions.role_id == role_id).delete()

      # Add the new ones
      permissions = list()
      for role_permission in role.role_permissions:
        new_permission = RolePermissions(role_id=role_id, permission_id=role_permission)
        db.add(new_permission)
        permissions.append(new_permission)
      role_model.permissions = permissions


    for key,value in role.model_dump(exclude_unset=True).items():
      if value is not None and key != 'role_permissions':
        setattr(role_model, key, value)
      

    db.commit()
    db.refresh(role_model)
    return convert_role_to_baserole(role_model, db)


@router.delete("/{role_id}", status_code=204)
async def delete_role(role_id:str, 
                      db:Session = Depends(get_db),
                      user: Users = Depends(get_current_user)
                      ):
    role_query = db.query(Roles).filter(Roles.id == role_id)
    
    if not user.cross_store_allowed:
        roles_query = filter_by_store(roles_query, Roles, user)
    
    role = role_query.first()
    
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    
    db.delete(role)
    db.commit()
    return
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.database.database import get_db
from app.database.models import Users, UserStores, Stores, Roles, UserRoles
from app.schemas.users_schemas import BaseUser, UserCreate, UserUpdate, UserResponse, UserRolePatch, UserStorePatch
from typing import List
from app.routers.utils import validate_ids, convert_usercreate_to_userresponse, convert_role_to_baserole, convert_store_to_basestore
from app.auth.hashing import hash_string

router = APIRouter(
    prefix='/users',
    tags=['Users']
)

@router.get("", response_model=List[UserResponse])
async def get_users(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    offset = (page - 1) * page_size
    users = (
        db.query(Users)
        .options(
            joinedload(Users.roles).joinedload(UserRoles.role),
            joinedload(Users.user_stores).joinedload(UserStores.store)
        )
        .offset(offset)
        .limit(page_size)
        .all()
    )
    
    user_responses = []
    for user in users:
      roles_list = [convert_role_to_baserole(user_role.role, db) for user_role in user.roles]
      stores_list = [convert_store_to_basestore(user_store.store) for user_store in user.user_stores]
      user_response = UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            cross_store_allowed=user.cross_store_allowed,
            user_stores=stores_list,
            user_roles=roles_list
        )
      user_responses.append(user_response)

    return user_responses

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: Session = Depends(get_db)):
    user = (
        db.query(Users)
        .options(
            joinedload(Users.roles).joinedload(UserRoles.role),
            joinedload(Users.user_stores).joinedload(UserStores.store)
        )
        .filter(Users.id == user_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    roles_list = [convert_role_to_baserole(user_role.role, db) for user_role in user.roles]
    stores_list = [convert_store_to_basestore(user_store.store) for user_store in user.user_stores]
    user_response = UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        cross_store_allowed=user.cross_store_allowed,
        user_stores=stores_list,
        user_roles=roles_list
    )

    return user_response

@router.get("/store/{store_id}", response_model = List[UserResponse])
async def get_users_by_store(
    store_id: str, 
    db: Session = Depends(get_db), 
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    offset = (page - 1) * page_size
    users = users = (
        db.query(Users)
        .options(
            joinedload(Users.roles).joinedload(UserRoles.role),
            joinedload(Users.user_stores).joinedload(UserStores.store)
        )
        .filter(UserStores.store_id == store_id)
        .offset(offset)
        .limit(page_size)
        .all()
    )
    
    user_responses = []
    for user in users:
      roles_list = [convert_role_to_baserole(user_role.role, db) for user_role in user.roles]
      stores_list = [convert_store_to_basestore(user_store.store) for user_store in user.user_stores]
      user_response = UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            cross_store_allowed=user.cross_store_allowed,
            user_stores=stores_list,
            user_roles=roles_list
        )
      user_responses.append(user_response)

    return user_responses

@router.post("", response_model=UserResponse)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    invalid_stores = validate_ids(user.user_stores, Stores, db)
    if len(invalid_stores) > 0:
        raise HTTPException(status_code=404, detail=f"Stores with the following ids were not found: {invalid_stores}")
    
    invalid_roles = validate_ids(user.user_roles, Roles, db)
    if len(invalid_roles) > 0:
        raise HTTPException(status_code=404, detail=f"Roles with the following ids were not found: {invalid_roles}")
    
    user.password = hash_string(user.password)

    new_user = Users(**user.model_dump(exclude=[
        "user_stores",
        "user_roles"
    ]))
        

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    for store_id in user.user_stores:
        user_store = UserStores(user_id=new_user.id, store_id=store_id)
        db.add(user_store)
    
    for role_id in user.user_roles:
        user_role = UserRoles(user_id=new_user.id, role_id=role_id)
        db.add(user_role)
    
    db.commit()
    return convert_usercreate_to_userresponse(new_user, user, db)


@router.patch(
    "/{user_id}/stores",
    response_model=UserResponse
)
async def patch_user_stores(user_id:str, user_stores:UserStorePatch, db:Session = Depends(get_db)):
    user_model = (
        db.query(Users)
        .options(
            joinedload(Users.roles).joinedload(UserRoles.role),
            joinedload(Users.user_stores).joinedload(UserStores.store)
        )
        .filter(Users.id == user_id)
        .first()
    )
    if not user_model:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user_stores.user_stores:
        raise HTTPException(status_code=400, detail="No body provided")

    invalid_stores = validate_ids(user_stores.user_stores, Stores, db)
    if len(invalid_stores) > 0:
        raise HTTPException(status_code=404, detail=f"Stores with the following ids were not found: {invalid_stores}")
    
    current_stores = [store.id for store in user_model.stores]
    for store_id in user_stores.user_stores:
        if store_id not in current_stores:
            user_store = UserStores(user_id=user_model.id, store_id=store_id)
            db.add(user_store)
    
    for store_id in current_stores:
        if store_id not in user_stores.user_stores:
            user_store = (
                db.query(UserStores)
                .filter(UserStores.user_id == user_model.id)
                .filter(UserStores.store_id == store_id)
                .first()
            )
            db.delete(user_store)
            #Delete associated roles as well
            (db.query(UserRoles)
                .filter(UserRoles.user_id == user_model.id)
                .filter(UserRoles.role_id
                        .in_([role.id for role in db.query(Roles)
                            .filter(Roles.store_id == store_id)
                            .all()]))
                            .delete())
    db.commit()
    updated_user = (
        db.query(Users)
        .options(
            joinedload(Users.roles).joinedload(UserRoles.role),
            joinedload(Users.user_stores).joinedload(UserStores.store)
        )
        .filter(Users.id == user_id)
        .first()
    )

    roles_list = [convert_role_to_baserole(user_role.role, db) for user_role in updated_user.roles]
    stores_list = [convert_store_to_basestore(user_store.store) for user_store in updated_user.user_stores]
    user_response = UserResponse(
        id=updated_user.id,
        name=updated_user.name,
        email=updated_user.email,
        cross_store_allowed=updated_user.cross_store_allowed,
        user_stores=stores_list,
        user_roles=roles_list
    )
    
    return user_response


@router.patch(
    "/{user_id}/roles",
    response_model=UserResponse
)
async def patch_user_roles(user_id:str, user_roles:UserRolePatch, db:Session = Depends(get_db)):
    user_model = (
        db.query(Users)
        .options(
            joinedload(Users.roles).joinedload(UserRoles.role),
            joinedload(Users.user_stores).joinedload(UserStores.store)
        )
        .filter(Users.id == user_id)
        .first()
    )
    if not user_model:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user_roles.user_roles:
        raise HTTPException(status_code=400, detail="No roles provided")
    
    invalid_roles = validate_ids(user_roles.user_roles, Roles, db)
    if len(invalid_roles) > 0:
        raise HTTPException(status_code=404, detail=f"Roles with the following ids were not found: {invalid_roles}")
    
    current_role_ids = [role.id for role in user_model.roles]
    current_store_ids = [store.id for store in user_model.stores]
    
    for role_id in user_roles.user_roles:
        if role_id not in current_role_ids:
            role_store = db.query(Roles).filter(Roles.id == role_id).first().store_id
            
            if role_store not in current_store_ids:
                raise HTTPException(status_code=403, detail="User isn't assigned to the store that the role belongs to")
            
            user_role = UserRoles(user_id=user_model.id, role_id=role_id)
            db.add(user_role)
    for role_id in current_role_ids:
        if role_id not in user_roles.user_roles:
            user_role = (
                db.query(UserRoles)
                .filter(UserRoles.user_id == user_model.id)
                .filter(UserRoles.role_id == role_id)
                .first()
            )
            db.delete(user_role)

    db.commit()
    updated_user = (
        db.query(Users)
        .options(
            joinedload(Users.roles).joinedload(UserRoles.role),
            joinedload(Users.user_stores).joinedload(UserStores.store)
        )
        .filter(Users.id == user_id)
        .first()
    )

    roles_list = [convert_role_to_baserole(user_role.role, db) for user_role in updated_user.roles]
    stores_list = [convert_store_to_basestore(user_store.store) for user_store in updated_user.user_stores]
    user_response = UserResponse(
        id=updated_user.id,
        name=updated_user.name,
        email=updated_user.email,
        user_stores=stores_list,
        user_roles=roles_list
    )
    
    return user_response


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user: UserUpdate, db: Session = Depends(get_db)):
    user_model = (
        db.query(Users)
        .options(
            joinedload(Users.roles).joinedload(UserRoles.role),
            joinedload(Users.user_stores).joinedload(UserStores.store)
        )
        .filter(Users.id == user_id)
        .first()
    )
    if not user_model:
        raise HTTPException(status_code=404, detail="User not found")

    
    for key,value in user.model_dump().items():
        if value is not None:
            if key == "password":
                value = hash_string(value)
            setattr(user_model, key, value)

    db.commit()

    user_model = (
        db.query(Users)
        .options(
            joinedload(Users.roles).joinedload(UserRoles.role),
            joinedload(Users.user_stores).joinedload(UserStores.store)
        )
        .filter(Users.id == user_id)
        .first()
    )

    roles_list = [convert_role_to_baserole(user_role.role, db) for user_role in user_model.roles]
    stores_list = [convert_store_to_basestore(user_store.store) for user_store in user_model.user_stores]
    user_response = UserResponse(
        id=user_model.id,
        name=user_model.name,
        email=user_model.email,
        cross_store_allowed=user_model.cross_store_allowed,
        user_stores=stores_list,
        user_roles=roles_list
    )
    
    return user_response

@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id:str, db:Session = Depends(get_db)):
    user = db.query(Users).filter(Users.id == user_id).first()
    user_roles = db.query(UserRoles).filter(UserRoles.user_id == user_id).all()
    user_stores = db.query(UserStores).filter(UserStores.user_id == user_id).all()
    for user_role in user_roles:
        db.delete(user_role)
    for user_store in user_stores:
        db.delete(user_store)
    db.commit()
    
    db.delete(user)
    db.commit()
    return
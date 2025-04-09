from sqlalchemy.orm import Session
from sqlalchemy.orm.query import Query
from app.database.models import Permissions, Roles, Stores, Base, Users
from typing import List
from app.schemas.users_schemas import BaseRole, BasePermission, BaseStore, UserCreate, UserResponse
from sqlalchemy.inspection import inspect

def validate_ids(ids_list: List[str|None], model: Base, db: Session)-> list[str|None]:
    invalid_ids = list()
    for id in ids_list:
        item = db.query(model).filter(model.id == id).first()
        if not item:
            invalid_ids.append(id)
    
    return invalid_ids


def convert_store_to_basestore(store):
    store_data = {
        column.name: getattr(store, column.name)
        for column in inspect(Stores).c
    }
    return BaseStore(**store_data)

def convert_role_to_baserole(role: Roles, db: Session) -> BaseRole:
    permissions_list = []
    for rp in role.permissions:  # Assuming 'permissions' is the backref from RolePermissions
        permission = db.query(Permissions).filter(Permissions.id == rp.permission_id).first()
        if permission:
            permission_data = {
                column.name: getattr(permission, column.name)
                for column in inspect(Permissions).c
            }
            permissions_list.append(BasePermission(**permission_data))

    return BaseRole(
        id=role.id,
        name=role.name,
        store_id=role.store_id,
        role_permissions=permissions_list,
        created_at=role.created_at,
        updated_at=role.updated_at
    )


def convert_usercreate_to_userresponse(new_user:Users, user: UserCreate, db: Session) -> UserResponse:
    stores_list = []
    roles_list = []
    for store in user.user_stores:
        store = db.query(Stores).filter(Stores.id == store).first()
        if store:
            store_data = {
                column.name: getattr(store, column.name)
                for column in inspect(Stores).c
            }
            stores_list.append(BaseStore(**store_data))

    for role in user.user_roles:
        role = db.query(Roles).filter(Roles.id == role).first()
        if role:
            role_data = {
                column.name: getattr(role, column.name)
                for column in inspect(Roles).c
            }
            roles_list.append(BaseRole(**role_data))

    return UserResponse(
        id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        user_stores=stores_list,
        user_roles=roles_list
    )

def filter_by_store(db_query:Query, object:Base, user:Users):
    try:
        filtered_query = db_query.filter(object.store_id.in_([store.id for store in user.stores]))
        return filtered_query
    except Exception as e:
        print(f'Encountered the following exception: {e}. Returning unfiltered query')
        return db_query


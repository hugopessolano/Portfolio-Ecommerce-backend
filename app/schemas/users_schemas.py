from pydantic import BaseModel, EmailStr
from typing import List, Optional
from app.schemas.base_schema import BaseSchema
from app.schemas.stores_schemas import BaseStore

class BasePermission(BaseSchema):
    name: str
    state: bool
    description: str|None = None
    
    class Config:
        orm_mode = True

class BaseRole(BaseSchema):
    name: str
    store_id: Optional[str] = None
    role_permissions: List[BasePermission] = []

    class Config:
        orm_mode = True

class BaseUser(BaseSchema):
    name: str|None = None
    email: EmailStr
    password: str
    cross_store_allowed: bool
    user_roles: List[BaseRole]
    user_stores: List[BaseStore]

    class Config:
        orm_mode = True

class PermissionCreate(BaseModel):
    name: str
    state: bool = True
    description: str|None = None

class RoleCreate(BaseModel):
    name: str
    store_id: str
    role_permissions: List[str] = []

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    cross_store_allowed: bool = False
    user_stores: List[str]
    user_roles: List[str] = []

class PermissiontUpdate(BaseModel):
    name: Optional[str|None] = None
    state: Optional[bool|None] = None
    description: Optional[str|None] = None

    class Config:
        orm_mode = True

class RoleUpdate(BaseModel):
    name: Optional[str|None] = None
    role_permissions: Optional[List[str]|None] = None

    class Config:
        orm_mode = True
    
class UserUpdate(BaseModel):
    name: Optional[str|None] = None
    email: Optional[EmailStr|None] = None
    password: Optional[str|None] = None
    cross_store_allowed: Optional[bool|None] = None

    class Config:
        orm_mode = True

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    cross_store_allowed: bool
    user_stores: List[BaseStore]
    user_roles: List[BaseRole]

    class Config:
        orm_mode = True

class UserRolePatch(BaseModel):
    user_roles: List[str]

    class Config:
        orm_mode = True

class UserStorePatch(BaseModel):
    user_stores: List[str]

    class Config:
        orm_mode = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

    class Config:
        orm_mode = True

    
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.database.database import get_db
from app.database.models import Users, UserStores, Stores, Roles, UserRoles
from app.schemas.users_schemas import UserLogin
from typing import List
from app.routers.utils import validate_ids, convert_usercreate_to_userresponse, convert_role_to_baserole, convert_store_to_basestore
from app.auth.hashing import verify
from app.auth.oauth2 import create_access_token
from fastapi.security.oauth2 import OAuth2PasswordRequestForm
import itertools



router = APIRouter(
    prefix='/auth',
    tags=['Authentication']
)

@router.post("/login")
async def login(user_credentials: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user_model = db.query(Users).filter(Users.email == user_credentials.username).first()
    if not user_model:
        raise HTTPException(status_code=403, detail="Invalid Credentials")
    
    try: 
        if not verify(user_credentials.password, user_model.password):
            raise HTTPException(status_code=403, detail="Invalid Credentials")
    except:
        raise HTTPException(status_code=403, detail="Invalid Credentials")
    
    access_token = create_access_token({
        "user_id": user_model.id
    })
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }   
    
    
    
    

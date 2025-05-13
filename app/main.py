from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.models import Base
from app.database.database import engine
from app.views.views_creation import create_default_views
from app.routers import products, customers, orders, stores, users, roles, permissions, auth
from app.auth.build_permissions import build_permissions
from starlette.middleware.base import BaseHTTPMiddleware
from app.middleware import log_middleware, add_headers_middleware
from app.initialization import initialize_database

Base.metadata.create_all(bind=engine)
create_default_views()

app = FastAPI()
app.add_middleware(BaseHTTPMiddleware,dispatch=log_middleware)
app.add_middleware(BaseHTTPMiddleware,dispatch=add_headers_middleware)

origins = [
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"], 
    expose_headers=["X-Next-Page", "X-Last-Page"],
)

app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(stores.router)
app.include_router(users.router)
app.include_router(roles.router)
app.include_router(permissions.router)
app.include_router(auth.router)

build_permissions(app)
initialize_database()

@app.get("/")
async def root():
    return {"message": "Service Running"}



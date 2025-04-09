from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.models import Base, Products, Customers, OrderProducts, Orders, Stores, Users, Roles, Permissions, UserRoles, RolePermissions, UserStores
from database.database import engine
from views.views_creation import create_default_views
from routers import products, customers, orders, stores, users, roles, permissions, auth
from pydantic_settings import BaseSettings
from auth.build_permissions import build_permissions
import uvicorn

class Settings(BaseSettings):
    workers: int = 1
    backlog: int = 2048
    limit_concurrency: int = 1000
    limit_max_requests: int = 10000
    timeout_keep_alive: int = 5

settings = Settings()

Base.metadata.create_all(bind=engine)
create_default_views()

app = FastAPI()

# CORS Middleware Configuration
origins = [
    "*", # Allow all origins for development. For production, specify allowed origins.
    # Example for production:
    # "http://localhost",
    # "http://localhost:8080", # If using a specific port for frontend dev server
    # "https://your-frontend-domain.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, # Allow cookies/authorization headers
    allow_methods=["*"], # Allow all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"], # Allow all headers
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

@app.get("/")
async def root():
    return {"message": "Hello World"}

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        workers=settings.workers,
        backlog=settings.backlog,
        limit_concurrency=settings.limit_concurrency,
        limit_max_requests=settings.limit_max_requests,
        timeout_keep_alive=settings.timeout_keep_alive,
        reload=True
    )

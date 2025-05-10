# FastAPI E-commerce Backend Application

This document provides instructions on how to set up, run, and manage the FastAPI e-commerce backend application using Docker and Docker Compose.

## Deployed version:
Swagger Docs: https://portfolio-ecommerce-backend-production.up.railway.app/docs#/

## Overview

The application serves as the backend API for an e-commerce platform. It handles products, customers, orders, user authentication, roles, permissions, and more. It uses SQLite for its databases and Alembic for database migrations.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Docker**: [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose**: Docker Compose is included with Docker Desktop for Windows and macOS. For Linux, follow the [installation guide](https://docs.docker.com/compose/install/).

## Running the Application

All `docker-compose` commands should be run from the project root directory (`Portfolio-Ecommerce-backend/`), so make sure to position your terminal on the appropriate directory.

### First-Time Setup

To build the Docker image and start the application for the first time:

```bash
docker-compose up --build -d
```

- `--build`: Forces Docker Compose to build the image based on the `app/Dockerfile`.
- `-d`: Runs the containers in detached mode (in the background).

On the first run, the application will:
- Create the necessary SQLite database files (`app.db`, `mi_aplicacion_logs.db`) inside the `/Portfolio-Ecommerce-backend/app/` directory (due to the volume mount).
- Apply initial database schema and populate default views.
- Build initial permissions and create a default admin user and base data as defined in `app/initialization.py`.
_The credentials for the default user will be:_
user: `admin@admin.com`
password: `admin`

### Subsequent Runs

To start the application after it has been built:

```bash
docker-compose up
```

### Viewing Logs

To view the logs from the running application container:

```bash
docker-compose logs -f app
```

Press `Ctrl+C` to stop tailing the logs.

### Accessing the Application

Once the application is running, you can access it at:

- **API Base URL**: `http://localhost:8000/`
- **API Documentation (Swagger UI)**: `http://localhost:8000/docs`
- **Alternative API Documentation (ReDoc)**: `http://localhost:8000/redoc`

### Stopping the Application

To stop and remove the containers:

```bash
docker-compose down
```

If you also want to remove the volumes (though for SQLite files mapped directly to the host, this is less critical unless you have named volumes for other services), you can use:
`docker-compose down -v`

## Database

The application uses two SQLite database files:

- `/Portfolio-Ecommerce-backend/app/app.db`: Main application database.
- `/Portfolio-Ecommerce-backend/app/mi_aplicacion_logs.db`: Database for storing logs.

These files are stored directly in the `/Portfolio-Ecommerce-backend/app/` directory on your host machine because the `docker-compose.yml` mounts this directory as a volume into the container. This ensures data persistence across container restarts.

The initial schema creation and data population are handled by the application on startup (see `app/main.py` and `app/initialization.py`).

## Alembic Migrations

Alembic is used for managing database schema migrations. If you make changes to your SQLAlchemy models, you'll need to generate and apply migrations.

1.  **Generate a new migration script:**
    After changing your models in `app/database/models/`, run:
    ```bash
    docker-compose exec app alembic revision --autogenerate -m "Your descriptive migration message"
    ```
    This will create a new migration file in `/Portfolio-Ecommerce-backend/app/alembic/versions/`.

2.  **Apply migrations:**
    To apply all pending migrations to the database:
    ```bash
    docker-compose exec app alembic upgrade head
    ```

3.  **Downgrade migrations (if needed):**
    To revert the last migration:
    ```bash
    docker-compose exec app alembic downgrade -1
    ```

---

*Make sure to replace `/path/to/your/project/` with the actual path to your project if you are sharing these instructions.*


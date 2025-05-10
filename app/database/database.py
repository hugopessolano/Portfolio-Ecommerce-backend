from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

#DATABASE_URL = "sqlite:///./app.db"
DATABASE_URL = "sqlite:///./app/app.db"


engine = create_engine(
    DATABASE_URL,
    connect_args={
        "check_same_thread": False,
        "timeout": 30
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

#Session = sessionmaker(engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


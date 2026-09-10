from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

if not (settings.DATABASE_URL.startswith("postgresql://") or settings.DATABASE_URL.startswith("postgresql+psycopg://")):
    raise RuntimeError(
        "FATAL: Database must be PostgreSQL. SQLite fallback has been completely removed."
    )

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

"""
app/database.py - Async SQLAlchemy setup with PostgreSQL.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator
import logging
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./studybuddy.db")

# Render provides postgres:// but SQLAlchemy requires postgresql+asyncpg://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# SQLite needs check_same_thread=False; pool settings only apply to server DBs
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("DEBUG", "False").lower() == "true",
    pool_pre_ping=True,
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as exc:
            await session.rollback()
            logger.error("Database session error: %s", exc)
            raise
        finally:
            await session.close()


async def create_tables() -> None:
    """Create all tables defined in models."""
    async with engine.begin() as conn:
        from app import models  # noqa: F401 – ensures models are registered
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified.")


async def drop_tables() -> None:
    """Drop all tables (use only in dev/testing)."""
    async with engine.begin() as conn:
        from app import models  # noqa: F401
        await conn.run_sync(Base.metadata.drop_all)
    logger.warning("All database tables dropped.")

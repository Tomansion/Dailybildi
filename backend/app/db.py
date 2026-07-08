from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool
from app.config import get_settings

settings = get_settings()

# Create engine with proper SQLite configuration
if settings.DATABASE_URL.startswith("sqlite"):
    sqlite_engine_kwargs = {
        "connect_args": {"check_same_thread": False},
    }

    # Only use a single shared connection for in-memory SQLite.
    # File-backed SQLite databases need separate pooled connections,
    # otherwise concurrent requests can corrupt transaction state.
    if settings.DATABASE_URL.endswith(":memory:"):
        sqlite_engine_kwargs["poolclass"] = StaticPool

    engine = create_engine(settings.DATABASE_URL, **sqlite_engine_kwargs)

    # Enable foreign key constraint checking for SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency for getting database session in routes"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)

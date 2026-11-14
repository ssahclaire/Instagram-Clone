from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def _sqlite_pragmas(dbapi_conn, _record):
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA foreign_keys = ON")  # enforce FKs / ON DELETE CASCADE (off by default in SQLite)
    cur.execute("PRAGMA journal_mode = WAL")  # readers don't block the writer
    cur.execute("PRAGMA busy_timeout = 5000")  # wait up to 5s for a lock instead of failing immediately
    cur.execute("PRAGMA synchronous = NORMAL")  # safe with WAL, fewer fsyncs
    cur.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

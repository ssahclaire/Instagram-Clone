"""Small, idempotent schema fixes for an existing SQLite file.

`Base.metadata.create_all()` only creates missing tables; it never changes existing ones.
Each step here checks the current schema first, so running it on every start is safe.
"""
from sqlalchemy import Engine
from sqlalchemy.exc import OperationalError

# Columns removed from the models (backend.md §13.2). They are NOT NULL without a DB default,
# so leaving them in an old database would make every INSERT fail.
OBSOLETE_COLUMNS: dict[str, tuple[str, ...]] = {
    "users": ("is_active", "updated_at"),
    "posts": ("updated_at",),
    "hashtags": ("created_at",),
}


LOCKED_HINT = (
    "데이터베이스 파일이 다른 프로그램에 잠겨 있어 스키마를 정리할 수 없습니다. "
    "DB Browser for SQLite 등에서 instagram.db를 열어 두었다면 '변경사항 저장' 또는 '되돌리기' 후 닫고, "
    "이전에 실행한 서버가 남아 있다면 종료한 뒤 다시 실행하세요."
)


def run_migrations(engine: Engine) -> list[str]:
    """Apply pending schema fixes; returns a description of what changed."""
    try:
        return _run(engine)
    except OperationalError as e:
        if "locked" in str(e.orig):
            raise RuntimeError(LOCKED_HINT) from e
        raise


def _run(engine: Engine) -> list[str]:
    done: list[str] = []
    with engine.begin() as conn:
        for table, columns in OBSOLETE_COLUMNS.items():
            existing = {row[1] for row in conn.exec_driver_sql(f'PRAGMA table_info("{table}")')}
            for col in columns:
                if col in existing:
                    conn.exec_driver_sql(f'ALTER TABLE "{table}" DROP COLUMN "{col}"')  # SQLite 3.35+
                    done.append(f"dropped {table}.{col}")
    return done

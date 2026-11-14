import sqlite3

from sqlalchemy import create_engine

from app.core.migrations import run_migrations

API = "/api/v1"


def test_migration_drops_obsolete_columns(tmp_path):
    """An instagram.db created before §13.2 still has NOT NULL columns the models no longer fill."""
    path = tmp_path / "old.db"
    con = sqlite3.connect(path)
    con.executescript("""
        CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR(30) NOT NULL,
                            is_active BOOLEAN NOT NULL, updated_at DATETIME NOT NULL);
        CREATE TABLE posts (id INTEGER PRIMARY KEY, caption TEXT NOT NULL, updated_at DATETIME NOT NULL);
        CREATE TABLE hashtags (id INTEGER PRIMARY KEY, name VARCHAR(100) NOT NULL, created_at DATETIME NOT NULL);
        INSERT INTO users VALUES (1, 'old_user', 1, '2026-01-01');
    """)
    con.close()

    engine = create_engine(f"sqlite:///{path.as_posix()}")
    changes = run_migrations(engine)
    assert sorted(changes) == ["dropped hashtags.created_at", "dropped posts.updated_at",
                               "dropped users.is_active", "dropped users.updated_at"]
    assert run_migrations(engine) == []  # idempotent

    con = sqlite3.connect(path)
    assert [r[1] for r in con.execute("PRAGMA table_info(users)")] == ["id", "username"]
    con.execute("INSERT INTO users (username) VALUES ('new_user')")  # would fail before the migration
    assert con.execute("SELECT username FROM users ORDER BY id").fetchall() == [("old_user",), ("new_user",)]
    con.close()
    engine.dispose()


def test_migration_explains_locked_database(tmp_path):
    """Another program (e.g. DB Browser with unsaved changes) holding the write lock → clear message."""
    import pytest

    from app.core.migrations import LOCKED_HINT

    path = tmp_path / "locked.db"
    holder = sqlite3.connect(path, isolation_level=None)
    holder.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, is_active BOOLEAN NOT NULL)")
    holder.execute("BEGIN IMMEDIATE")  # keep the write lock, like an unsaved DB Browser session
    engine = create_engine(f"sqlite:///{path.as_posix()}", connect_args={"timeout": 0.2})
    try:
        with pytest.raises(RuntimeError, match="DB Browser"):
            run_migrations(engine)
        assert "다시 실행" in LOCKED_HINT
    finally:
        holder.execute("ROLLBACK")
        holder.close()
        engine.dispose()
    assert run_migrations(create_engine(f"sqlite:///{path.as_posix()}")) == ["dropped users.is_active"]


def test_removed_endpoints_are_gone(client):
    assert client.post(f"{API}/auth/token", data={"username": "x", "password": "y"}).status_code in (404, 405)
    # "/users/search" now resolves to the profile route for a user named "search"
    assert client.get(f"{API}/users/search", params={"q": "a"}).status_code == 404
    assert client.get(f"{API}/users/me/follow-requests").status_code in (404, 405)


def test_missing_or_bad_token_is_401(client):
    assert client.get(f"{API}/auth/me").status_code == 401
    assert client.get(f"{API}/auth/me", headers={"Authorization": "Bearer nope"}).status_code == 401
    assert client.get(f"{API}/auth/me", headers={"Authorization": "Basic abc"}).status_code == 401

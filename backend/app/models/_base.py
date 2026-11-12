from datetime import datetime, timezone


def utcnow() -> datetime:
    """Naive UTC timestamp (SQLite has no tz type; API layer adds the 'Z')."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

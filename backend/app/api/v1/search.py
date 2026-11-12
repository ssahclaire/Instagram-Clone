from fastapi import APIRouter, Query
from sqlalchemy import func, or_, select

from app.api.deps import DB, CurrentUser
from app.models import Hashtag, PostHashtag, User
from app.schemas.post import HashtagOut
from app.schemas.social import SearchResult

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResult)
def search(db: DB, _: CurrentUser, q: str = Query(min_length=1, max_length=50)):
    """'#tag' searches hashtags only; otherwise users + hashtags."""
    raw = q.strip().lower()
    tag_only = raw.startswith("#")
    term = raw.lstrip("#@")
    if not term:
        return SearchResult(users=[], hashtags=[])
    like = f"%{term}%"

    users = [] if tag_only else db.scalars(
        select(User).where(User.is_active.is_(True),
                           or_(User.username.like(like), func.lower(User.full_name).like(like)))
        .order_by(func.length(User.username)).limit(15)
    ).all()

    tag_rows = db.execute(
        select(Hashtag.name, func.count(PostHashtag.post_id).label("n"))
        .join(PostHashtag, PostHashtag.hashtag_id == Hashtag.id)
        .where(Hashtag.name.like(f"{term}%"))
        .group_by(Hashtag.id).order_by(func.count(PostHashtag.post_id).desc()).limit(10)
    ).all()
    return SearchResult(users=users, hashtags=[HashtagOut(name=n, post_count=c) for n, c in tag_rows])

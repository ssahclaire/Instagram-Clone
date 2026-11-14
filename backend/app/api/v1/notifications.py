from fastapi import APIRouter, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import selectinload

from app.api.deps import DB, CurrentUser
from app.models import Comment, Notification, PostImage
from app.schemas.social import NotificationOut
from app.services.social import user_list_items

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(db: DB, me: CurrentUser):
    """Latest 50 notifications."""
    items = db.scalars(
        select(Notification).options(selectinload(Notification.actor))
        .where(Notification.user_id == me.id)
        .order_by(Notification.created_at.desc(), Notification.id.desc()).limit(50)
    ).all()
    actors = {a.id: a for a in user_list_items(db, me, list({n.actor.id: n.actor for n in items}.values()))}
    post_ids = {n.post_id for n in items if n.post_id}
    thumbs: dict[int, str] = {}
    if post_ids:
        for img in db.scalars(select(PostImage).where(PostImage.post_id.in_(post_ids), PostImage.display_order == 0)):
            thumbs[img.post_id] = img.image_url
    comment_ids = {n.comment_id for n in items if n.comment_id}
    texts = dict(db.execute(select(Comment.id, Comment.content).where(Comment.id.in_(comment_ids))).all()) if comment_ids else {}
    return [
        NotificationOut(
            id=n.id, type=n.type, actor=actors[n.actor_id], post_id=n.post_id,
            post_thumbnail=thumbs.get(n.post_id) if n.post_id else None,
            comment_text=texts.get(n.comment_id) if n.comment_id else None,
            is_read=n.is_read, created_at=n.created_at,
        )
        for n in items
    ]


@router.get("/unread-count")
def unread_count(db: DB, me: CurrentUser) -> dict:
    n = db.scalar(select(func.count()).select_from(Notification).where(
        Notification.user_id == me.id, Notification.is_read.is_(False)))
    return {"count": n or 0}


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_read(db: DB, me: CurrentUser):
    db.execute(update(Notification).where(Notification.user_id == me.id, Notification.is_read.is_(False))
               .values(is_read=True))
    db.commit()

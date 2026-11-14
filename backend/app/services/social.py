"""Shared query helpers: follow relations, visibility rules, hashtags, notifications, serialisation."""
import re

from fastapi import HTTPException
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Bookmark, Comment, Follow, Hashtag, Notification, Post, PostHashtag, PostLike, User,
)
from app.schemas.post import CommentOut, PostImageOut, PostOut
from app.schemas.user import UserListItem, UserPublic

HASHTAG_RE = re.compile(r"#([0-9A-Za-z_가-힣]+)")


# ---------- follow / visibility ----------

def follow_status(db: Session, follower_id: int, following_id: int) -> str:
    f = db.get(Follow, (follower_id, following_id))
    return f.status if f else "none"


def can_view_user_content(db: Session, viewer: User | None, owner: User) -> bool:
    if not owner.is_private:
        return True
    if viewer is None:
        return False
    if viewer.id == owner.id:
        return True
    return follow_status(db, viewer.id, owner.id) == "accepted"


def following_ids_subquery(viewer_id: int):
    return select(Follow.following_id).where(Follow.follower_id == viewer_id, Follow.status == "accepted")


def public_user_ids():
    return select(User.id).where(User.is_private.is_(False))


def visible_posts_clause(viewer_id: int | None):
    """SQL condition for posts the viewer may see (public, own, or followed private). Guest → public only."""
    if viewer_id is None:
        return Post.user_id.in_(public_user_ids())
    return or_(
        Post.user_id == viewer_id,
        Post.user_id.in_(select(User.id).where(User.is_private.is_(False))),
        Post.user_id.in_(following_ids_subquery(viewer_id)),
    )


def get_user_or_404(db: Session, username: str) -> User:
    user = db.scalar(select(User).where(User.username == username.lower()))
    if not user:
        raise HTTPException(404, "사용자를 찾을 수 없습니다.")
    return user


def get_visible_post_or_404(db: Session, viewer: User | None, post_id: int) -> Post:
    post = db.get(Post, post_id)
    if not post or not can_view_user_content(db, viewer, post.author):
        raise HTTPException(404, "게시물을 찾을 수 없습니다.")
    return post


def user_list_items(db: Session, viewer: User | None, users: list[User]) -> list[UserListItem]:
    if not users:
        return []
    status = {}
    if viewer is not None:
        status = dict(db.execute(
            select(Follow.following_id, Follow.status).where(
                Follow.follower_id == viewer.id, Follow.following_id.in_([u.id for u in users])
            )
        ).all())
    return [
        UserListItem(
            **UserPublic.model_validate(u).model_dump(),
            follow_status=status.get(u.id, "none"),
            is_me=viewer is not None and u.id == viewer.id,
        )
        for u in users
    ]


# ---------- hashtags ----------

def extract_hashtags(text: str) -> set[str]:
    return {m.lower() for m in HASHTAG_RE.findall(text or "")}


def sync_hashtags(db: Session, post: Post) -> None:
    db.execute(delete(PostHashtag).where(PostHashtag.post_id == post.id))
    for name in extract_hashtags(post.caption):
        tag = db.scalar(select(Hashtag).where(Hashtag.name == name))
        if not tag:
            tag = Hashtag(name=name)
            db.add(tag)
            db.flush()
        db.add(PostHashtag(post_id=post.id, hashtag_id=tag.id))


# ---------- notifications ----------

def notify(db: Session, *, recipient_id: int, actor_id: int, type: str,
           post_id: int | None = None, comment_id: int | None = None) -> None:
    if recipient_id == actor_id:
        return
    db.add(Notification(user_id=recipient_id, actor_id=actor_id, type=type, post_id=post_id, comment_id=comment_id))


def unnotify(db: Session, *, recipient_id: int, actor_id: int, type: str, post_id: int | None = None) -> None:
    stmt = delete(Notification).where(
        Notification.user_id == recipient_id, Notification.actor_id == actor_id, Notification.type == type
    )
    if post_id is not None:
        stmt = stmt.where(Notification.post_id == post_id)
    db.execute(stmt)


# ---------- serialisation ----------

def serialize_posts(db: Session, viewer: User | None, posts: list[Post]) -> list[PostOut]:
    if not posts:
        return []
    ids = [p.id for p in posts]
    like_counts = dict(db.execute(
        select(PostLike.post_id, func.count()).where(PostLike.post_id.in_(ids)).group_by(PostLike.post_id)
    ).all())
    comment_counts = dict(db.execute(
        select(Comment.post_id, func.count()).where(Comment.post_id.in_(ids)).group_by(Comment.post_id)
    ).all())
    liked: set[int] = set()
    saved: set[int] = set()
    if viewer is not None:
        liked = set(db.scalars(select(PostLike.post_id).where(PostLike.user_id == viewer.id, PostLike.post_id.in_(ids))))
        saved = set(db.scalars(select(Bookmark.post_id).where(Bookmark.user_id == viewer.id, Bookmark.post_id.in_(ids))))
    return [
        PostOut(
            id=p.id,
            author=UserPublic.model_validate(p.author),
            caption=p.caption,
            location=p.location,
            images=[PostImageOut.model_validate(i) for i in p.images],
            like_count=like_counts.get(p.id, 0),
            comment_count=comment_counts.get(p.id, 0),
            is_liked=p.id in liked,
            is_bookmarked=p.id in saved,
            created_at=p.created_at,
        )
        for p in posts
    ]


def post_query():
    return select(Post).options(selectinload(Post.author), selectinload(Post.images))


def serialize_comment(c: Comment) -> CommentOut:
    return CommentOut(
        id=c.id, post_id=c.post_id, parent_id=c.parent_id,
        author=UserPublic.model_validate(c.author), content=c.content, created_at=c.created_at,
    )

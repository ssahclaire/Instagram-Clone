from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func, select

from app.api.deps import DB, CurrentUser, OptionalUser
from app.core.config import settings
from app.models import Bookmark, Comment, Hashtag, Post, PostHashtag, PostImage, PostLike, User
from app.schemas.post import (
    BookmarkResult, CommentIn, CommentOut, LikeResult, PostOut, PostUpdate,
)
from app.schemas.user import UserListItem
from app.services.files import delete_image, save_image
from app.services.social import (
    following_ids_subquery, get_visible_post_or_404, notify, post_query, serialize_comment,
    serialize_posts, sync_hashtags, unnotify, user_list_items, visible_posts_clause,
)

router = APIRouter(prefix="/posts", tags=["posts"])


def _page(limit: int) -> int:
    return max(1, min(limit, 50))


@router.get("/feed", response_model=list[PostOut])
def feed(db: DB, me: OptionalUser, skip: int = 0, limit: int = 10):
    """Logged in: my posts + accounts I follow (accepted). Guest: all public posts. Newest first."""
    if me is None:
        cond = visible_posts_clause(None)
    else:
        cond = (Post.user_id == me.id) | Post.user_id.in_(following_ids_subquery(me.id))
    posts = db.scalars(
        post_query().where(cond)
        .order_by(Post.created_at.desc(), Post.id.desc())
        .offset(skip).limit(_page(limit))
    ).all()
    return serialize_posts(db, me, list(posts))


@router.get("/explore", response_model=list[PostOut])
def explore(db: DB, me: OptionalUser, skip: int = 0, limit: int = 24):
    """Visible posts from other users, ranked by likes then recency."""
    likes = select(PostLike.post_id, func.count().label("n")).group_by(PostLike.post_id).subquery()
    q = post_query().outerjoin(likes, likes.c.post_id == Post.id).where(visible_posts_clause(me.id if me else None))
    if me is not None:
        q = q.where(Post.user_id != me.id)
    posts = db.scalars(
        q.order_by(func.coalesce(likes.c.n, 0).desc(), Post.created_at.desc())
        .offset(skip).limit(_page(limit))
    ).all()
    return serialize_posts(db, me, list(posts))


@router.get("/tags/{name}", response_model=list[PostOut])
def posts_by_tag(name: str, db: DB, me: OptionalUser, skip: int = 0, limit: int = 30):
    tag = db.scalar(select(Hashtag).where(Hashtag.name == name.lower().lstrip("#")))
    if not tag:
        return []
    posts = db.scalars(
        post_query().join(PostHashtag, PostHashtag.post_id == Post.id)
        .where(PostHashtag.hashtag_id == tag.id, visible_posts_clause(me.id if me else None))
        .order_by(Post.created_at.desc()).offset(skip).limit(_page(limit))
    ).all()
    return serialize_posts(db, me, list(posts))


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
async def create_post(
    db: DB, me: CurrentUser,
    files: list[UploadFile] = File(..., description="이미지 1~10장"),
    caption: str = Form(default="", max_length=2200),
    location: str = Form(default="", max_length=100),
):
    if not files:
        raise HTTPException(400, "이미지를 1장 이상 선택해 주세요.")
    if len(files) > settings.MAX_IMAGES_PER_POST:
        raise HTTPException(400, f"이미지는 최대 {settings.MAX_IMAGES_PER_POST}장까지 업로드할 수 있습니다.")
    urls: list[str] = []
    try:
        for f in files:
            urls.append(await save_image(f, "posts"))
    except HTTPException:
        for u in urls:
            delete_image(u)
        raise
    post = Post(user_id=me.id, caption=caption.strip(), location=location.strip())
    post.images = [PostImage(image_url=u, display_order=i) for i, u in enumerate(urls)]
    db.add(post)
    db.flush()
    sync_hashtags(db, post)
    db.commit()
    db.refresh(post)
    return serialize_posts(db, me, [post])[0]


@router.get("/{post_id}", response_model=PostOut)
def get_post(post_id: int, db: DB, me: OptionalUser):
    return serialize_posts(db, me, [get_visible_post_or_404(db, me, post_id)])[0]


@router.put("/{post_id}", response_model=PostOut)
def update_post(post_id: int, body: PostUpdate, db: DB, me: CurrentUser):
    post = get_visible_post_or_404(db, me, post_id)
    if post.user_id != me.id:
        raise HTTPException(403, "본인 게시물만 수정할 수 있습니다.")
    if body.caption is not None:
        post.caption = body.caption.strip()
        sync_hashtags(db, post)
    if body.location is not None:
        post.location = body.location.strip()
    db.commit()
    db.refresh(post)
    return serialize_posts(db, me, [post])[0]


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, db: DB, me: CurrentUser):
    post = get_visible_post_or_404(db, me, post_id)
    if post.user_id != me.id:
        raise HTTPException(403, "본인 게시물만 삭제할 수 있습니다.")
    urls = [i.image_url for i in post.images]
    db.delete(post)
    db.commit()
    for u in urls:
        delete_image(u)


@router.post("/{post_id}/like", response_model=LikeResult)
def toggle_like(post_id: int, db: DB, me: CurrentUser):
    post = get_visible_post_or_404(db, me, post_id)
    existing = db.get(PostLike, (me.id, post.id))
    if existing:
        db.delete(existing)
        unnotify(db, recipient_id=post.user_id, actor_id=me.id, type="like", post_id=post.id)
    else:
        db.add(PostLike(user_id=me.id, post_id=post.id))
        notify(db, recipient_id=post.user_id, actor_id=me.id, type="like", post_id=post.id)
    db.commit()
    count = db.scalar(select(func.count()).select_from(PostLike).where(PostLike.post_id == post.id)) or 0
    return LikeResult(liked=existing is None, like_count=count)


@router.get("/{post_id}/likes", response_model=list[UserListItem])
def post_likers(post_id: int, db: DB, me: OptionalUser):
    post = get_visible_post_or_404(db, me, post_id)
    users = db.scalars(
        select(User).join(PostLike, PostLike.user_id == User.id)
        .where(PostLike.post_id == post.id).order_by(PostLike.created_at.desc())
    ).all()
    return user_list_items(db, me, list(users))


@router.post("/{post_id}/bookmark", response_model=BookmarkResult)
def toggle_bookmark(post_id: int, db: DB, me: CurrentUser):
    post = get_visible_post_or_404(db, me, post_id)
    existing = db.get(Bookmark, (me.id, post.id))
    if existing:
        db.delete(existing)
    else:
        db.add(Bookmark(user_id=me.id, post_id=post.id))
    db.commit()
    return BookmarkResult(bookmarked=existing is None)


@router.get("/{post_id}/comments", response_model=list[CommentOut])
def list_comments(post_id: int, db: DB, me: OptionalUser):
    """Flat list (oldest first); the client nests replies by parent_id."""
    post = get_visible_post_or_404(db, me, post_id)
    comments = db.scalars(
        select(Comment).where(Comment.post_id == post.id).order_by(Comment.created_at, Comment.id)
    ).all()
    return [serialize_comment(c) for c in comments]


@router.post("/{post_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def add_comment(post_id: int, body: CommentIn, db: DB, me: CurrentUser):
    post = get_visible_post_or_404(db, me, post_id)
    parent = None
    if body.parent_id is not None:
        parent = db.get(Comment, body.parent_id)
        if not parent or parent.post_id != post.id:
            raise HTTPException(400, "답글을 달 댓글을 찾을 수 없습니다.")
        if parent.parent_id is not None:  # keep threads one level deep, like Instagram
            parent = db.get(Comment, parent.parent_id)
    comment = Comment(post_id=post.id, user_id=me.id, parent_id=parent.id if parent else None,
                      content=body.content.strip())
    db.add(comment)
    db.flush()
    notify(db, recipient_id=post.user_id, actor_id=me.id, type="comment", post_id=post.id, comment_id=comment.id)
    if parent and parent.user_id != post.user_id:
        notify(db, recipient_id=parent.user_id, actor_id=me.id, type="reply", post_id=post.id, comment_id=comment.id)
    db.commit()
    db.refresh(comment)
    return serialize_comment(comment)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(comment_id: int, db: DB, me: CurrentUser):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(404, "댓글을 찾을 수 없습니다.")
    post = db.get(Post, comment.post_id)
    if me.id not in (comment.user_id, post.user_id):
        raise HTTPException(403, "댓글 작성자 또는 게시물 작성자만 삭제할 수 있습니다.")
    db.delete(comment)
    db.commit()

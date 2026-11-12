from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select

from app.api.deps import DB, CurrentUser, OptionalUser
from app.core.security import hash_password, verify_password
from app.models import Bookmark, Follow, Notification, Post, User
from app.schemas.post import PostOut
from app.schemas.user import (
    FollowResult, PasswordChange, Profile, ProfileUpdate, UserListItem, UserMe, UserPublic,
)
from app.services.files import delete_image, save_image
from app.services.social import (
    can_view_user_content, follow_status, get_user_or_404,
    notify, post_query, serialize_posts, unnotify, user_list_items,
)

router = APIRouter(prefix="/users", tags=["users"])


def _follower_count(db: DB, user_id: int) -> int:
    return db.scalar(select(func.count()).select_from(Follow).where(
        Follow.following_id == user_id, Follow.status == "accepted")) or 0


# ----- static paths first (before /{username}) -----

@router.get("/search", response_model=list[UserPublic])
def search_users(db: DB, _: OptionalUser, q: str = Query(min_length=1, max_length=50), limit: int = 20):
    term = f"%{q.strip().lower().lstrip('@')}%"
    return db.scalars(
        select(User).where(User.is_active.is_(True), or_(User.username.like(term), func.lower(User.full_name).like(term)))
        .order_by(func.length(User.username)).limit(min(limit, 50))
    ).all()


@router.get("/suggestions", response_model=list[UserListItem])
def suggestions(db: DB, me: OptionalUser, limit: int = 5):
    """People not yet followed, ranked by follower count. Guest: popular accounts."""
    followers = (
        select(Follow.following_id, func.count().label("n"))
        .where(Follow.status == "accepted").group_by(Follow.following_id).subquery()
    )
    q = select(User).outerjoin(followers, followers.c.following_id == User.id).where(User.is_active.is_(True))
    if me is not None:
        already = select(Follow.following_id).where(Follow.follower_id == me.id)
        q = q.where(User.id != me.id, User.id.not_in(already))
    users = db.scalars(
        q.order_by(func.coalesce(followers.c.n, 0).desc(), User.created_at.desc()).limit(min(limit, 30))
    ).all()
    return user_list_items(db, me, list(users))


@router.put("/me/profile", response_model=UserMe)
def update_profile(body: ProfileUpdate, db: DB, me: CurrentUser):
    data = body.model_dump(exclude_unset=True)
    if "username" in data and data["username"] != me.username:
        if db.scalar(select(User.id).where(User.username == data["username"])):
            raise HTTPException(status.HTTP_409_CONFLICT, "이미 사용 중인 사용자 이름입니다.")
    if data.get("is_private") is False and me.is_private:
        # switching to public: auto-accept pending requests
        for f in db.scalars(select(Follow).where(Follow.following_id == me.id, Follow.status == "pending")):
            f.status = "accepted"
        db.query(Notification).filter(
            Notification.user_id == me.id, Notification.type == "follow_request"
        ).update({Notification.type: "follow"})
    for k, v in data.items():
        if v is not None:
            setattr(me, k, v.strip() if isinstance(v, str) and k != "bio" else v)
    db.commit()
    db.refresh(me)
    return me


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(body: PasswordChange, db: DB, me: CurrentUser):
    if not verify_password(body.current_password, me.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "현재 비밀번호가 올바르지 않습니다.")
    me.hashed_password = hash_password(body.new_password)
    db.commit()


@router.post("/me/avatar", response_model=UserMe)
async def upload_avatar(db: DB, me: CurrentUser, file: UploadFile = File(...)):
    url = await save_image(file, "profiles")
    old = me.profile_image_url
    me.profile_image_url = url
    db.commit()
    delete_image(old)
    db.refresh(me)
    return me


@router.delete("/me/avatar", response_model=UserMe)
def delete_avatar(db: DB, me: CurrentUser):
    old = me.profile_image_url
    me.profile_image_url = None
    db.commit()
    delete_image(old)
    db.refresh(me)
    return me


@router.get("/me/saved", response_model=list[PostOut])
def saved_posts(db: DB, me: CurrentUser, skip: int = 0, limit: int = 30):
    posts = db.scalars(
        post_query().join(Bookmark, Bookmark.post_id == Post.id)
        .where(Bookmark.user_id == me.id).order_by(Bookmark.created_at.desc())
        .offset(skip).limit(min(limit, 60))
    ).all()
    # drop posts that became invisible (author went private)
    posts = [p for p in posts if can_view_user_content(db, me, p.author)]
    return serialize_posts(db, me, posts)


@router.get("/me/follow-requests", response_model=list[UserListItem])
def follow_requests(db: DB, me: CurrentUser):
    users = db.scalars(
        select(User).join(Follow, Follow.follower_id == User.id)
        .where(Follow.following_id == me.id, Follow.status == "pending")
        .order_by(Follow.created_at.desc())
    ).all()
    return user_list_items(db, me, list(users))


@router.post("/me/follow-requests/{username}/accept", status_code=status.HTTP_204_NO_CONTENT)
def accept_request(username: str, db: DB, me: CurrentUser):
    requester = get_user_or_404(db, username)
    f = db.get(Follow, (requester.id, me.id))
    if not f or f.status != "pending":
        raise HTTPException(404, "팔로우 요청이 없습니다.")
    f.status = "accepted"
    db.query(Notification).filter(
        Notification.user_id == me.id, Notification.actor_id == requester.id, Notification.type == "follow_request"
    ).update({Notification.type: "follow"})
    db.commit()


@router.delete("/me/follow-requests/{username}", status_code=status.HTTP_204_NO_CONTENT)
def decline_request(username: str, db: DB, me: CurrentUser):
    requester = get_user_or_404(db, username)
    f = db.get(Follow, (requester.id, me.id))
    if not f or f.status != "pending":
        raise HTTPException(404, "팔로우 요청이 없습니다.")
    db.delete(f)
    unnotify(db, recipient_id=me.id, actor_id=requester.id, type="follow_request")
    db.commit()


@router.delete("/me/followers/{username}", status_code=status.HTTP_204_NO_CONTENT)
def remove_follower(username: str, db: DB, me: CurrentUser):
    other = get_user_or_404(db, username)
    f = db.get(Follow, (other.id, me.id))
    if f:
        db.delete(f)
        db.commit()


# ----- /{username} routes -----

@router.get("/{username}", response_model=Profile)
def get_profile(username: str, db: DB, me: OptionalUser):
    user = get_user_or_404(db, username)
    post_count = db.scalar(select(func.count()).select_from(Post).where(Post.user_id == user.id)) or 0
    following_count = db.scalar(select(func.count()).select_from(Follow).where(
        Follow.follower_id == user.id, Follow.status == "accepted")) or 0
    return Profile(
        **UserPublic.model_validate(user).model_dump(),
        bio=user.bio, website=user.website,
        post_count=post_count,
        follower_count=_follower_count(db, user.id),
        following_count=following_count,
        follow_status=follow_status(db, me.id, user.id) if me and user.id != me.id else "none",
        follows_you=bool(me) and follow_status(db, user.id, me.id) == "accepted",
        is_me=bool(me) and user.id == me.id,
        can_view_posts=can_view_user_content(db, me, user),
    )


@router.get("/{username}/posts", response_model=list[PostOut])
def user_posts(username: str, db: DB, me: OptionalUser, skip: int = 0, limit: int = 30):
    user = get_user_or_404(db, username)
    if not can_view_user_content(db, me, user):
        raise HTTPException(403, "비공개 계정입니다.")
    posts = db.scalars(
        post_query().where(Post.user_id == user.id).order_by(Post.created_at.desc(), Post.id.desc())
        .offset(skip).limit(min(limit, 60))
    ).all()
    return serialize_posts(db, me, list(posts))


@router.post("/{username}/follow", response_model=FollowResult)
def toggle_follow(username: str, db: DB, me: CurrentUser):
    """Follow (or request, for private accounts); calling again unfollows / cancels the request."""
    target = get_user_or_404(db, username)
    if target.id == me.id:
        raise HTTPException(400, "자기 자신은 팔로우할 수 없습니다.")
    existing = db.get(Follow, (me.id, target.id))
    if existing:
        db.delete(existing)
        unnotify(db, recipient_id=target.id, actor_id=me.id, type="follow")
        unnotify(db, recipient_id=target.id, actor_id=me.id, type="follow_request")
        new_status = "none"
    else:
        new_status = "pending" if target.is_private else "accepted"
        db.add(Follow(follower_id=me.id, following_id=target.id, status=new_status))
        notify(db, recipient_id=target.id, actor_id=me.id,
               type="follow_request" if new_status == "pending" else "follow")
    db.commit()
    return FollowResult(follow_status=new_status, follower_count=_follower_count(db, target.id))


def _follow_list(db: DB, me: User | None, user: User, followers: bool) -> list[UserListItem]:
    if not can_view_user_content(db, me, user):
        raise HTTPException(403, "비공개 계정입니다.")
    if followers:
        q = select(User).join(Follow, Follow.follower_id == User.id).where(Follow.following_id == user.id)
    else:
        q = select(User).join(Follow, Follow.following_id == User.id).where(Follow.follower_id == user.id)
    users = db.scalars(q.where(Follow.status == "accepted").order_by(Follow.created_at.desc())).all()
    return user_list_items(db, me, list(users))


@router.get("/{username}/followers", response_model=list[UserListItem])
def followers(username: str, db: DB, me: OptionalUser):
    return _follow_list(db, me, get_user_or_404(db, username), followers=True)


@router.get("/{username}/following", response_model=list[UserListItem])
def following(username: str, db: DB, me: OptionalUser):
    return _follow_list(db, me, get_user_or_404(db, username), followers=False)

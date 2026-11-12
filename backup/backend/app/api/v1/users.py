from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, Follow
from app.schemas.user import UserResponse, UserProfileUpdate
from app.api.deps import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search")
def search_users(q: str = "", db: Session = Depends(get_db)):
    if not q:
        return []
    users = db.query(User).filter(User.username.ilike(f"%{q}%") | User.full_name.ilike(f"%{q}%")).limit(20).all()
    return users


@router.get("/{username}", response_model=UserResponse)
def get_user_profile(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return user


@router.put("/me/profile", response_model=UserResponse)
def update_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/avatar", response_model=UserResponse)
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.profile_image_url = f"/static/uploads/profiles/{file.filename}"
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me/avatar", response_model=UserResponse)
def delete_avatar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.profile_image_url = None
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/{username}/follow")
def toggle_follow(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = db.query(User).filter(User.username == username).first()
    if not target or target.id == current_user.id:
        raise HTTPException(status_code=400, detail="유효하지 않은 팔로우 요청입니다.")
    existing = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == target.id,
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"is_following": False}
    new_follow = Follow(follower_id=current_user.id, following_id=target.id)
    db.add(new_follow)
    db.commit()
    return {"is_following": True}

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    username: str
    password: str


class UserLogin(BaseModel):
    username_or_email: str
    password: str


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    website: Optional[str] = None
    bio: Optional[str] = None
    is_private: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    bio: str
    website: str
    profile_image_url: Optional[str] = None
    is_private: bool
    posts_count: int = 0
    followers_count: int = 0
    following_count: int = 0
    is_following: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

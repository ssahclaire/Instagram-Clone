from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


USERNAME_PATTERN = r"^[a-z0-9._]{1,30}$"


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    profile_image_url: str | None
    is_private: bool


class UserMe(UserPublic):
    """The logged-in user: what the settings page edits."""
    bio: str
    website: str


class UserListItem(UserPublic):
    """User row in followers/following/likes lists with viewer's relationship."""
    follow_status: Literal["none", "pending", "accepted"] = "none"
    is_me: bool = False


class Profile(UserPublic):
    bio: str
    website: str
    post_count: int
    follower_count: int
    following_count: int
    follow_status: Literal["none", "pending", "accepted"]
    follows_you: bool
    is_me: bool
    can_view_posts: bool


class RegisterIn(BaseModel):
    email: EmailStr
    full_name: str = Field(default="", max_length=50)
    username: str = Field(pattern=USERNAME_PATTERN)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username", mode="before")
    @classmethod
    def _lower(cls, v: str) -> str:
        return v.strip().lower() if isinstance(v, str) else v


class LoginIn(BaseModel):
    username: str = Field(description="사용자 이름 또는 이메일")
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserMe


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=50)
    username: str | None = Field(default=None, pattern=USERNAME_PATTERN)
    bio: str | None = Field(default=None, max_length=150)
    website: str | None = Field(default=None, max_length=255)
    is_private: bool | None = None

    @field_validator("username", mode="before")
    @classmethod
    def _lower(cls, v):
        return v.strip().lower() if isinstance(v, str) else v

    @field_validator("website")
    @classmethod
    def _url(cls, v):
        if v and not v.startswith(("http://", "https://")):
            v = "https://" + v
        return v


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class FollowResult(BaseModel):
    follow_status: Literal["none", "pending", "accepted"]
    follower_count: int

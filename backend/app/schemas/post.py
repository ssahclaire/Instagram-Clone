from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import UTCDateTime
from app.schemas.user import UserPublic


class PostImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_url: str
    display_order: int


class PostOut(BaseModel):
    id: int
    author: UserPublic
    caption: str
    location: str
    images: list[PostImageOut]
    like_count: int
    comment_count: int
    is_liked: bool
    is_bookmarked: bool
    created_at: UTCDateTime


class PostUpdate(BaseModel):
    caption: str | None = Field(default=None, max_length=2200)
    location: str | None = Field(default=None, max_length=100)


class CommentIn(BaseModel):
    content: str = Field(min_length=1, max_length=2200)
    parent_id: int | None = None


class CommentOut(BaseModel):
    id: int
    post_id: int
    parent_id: int | None
    author: UserPublic
    content: str
    created_at: UTCDateTime


class LikeResult(BaseModel):
    liked: bool
    like_count: int


class BookmarkResult(BaseModel):
    bookmarked: bool


class HashtagOut(BaseModel):
    name: str
    post_count: int

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel


class PostImageSchema(BaseModel):
    id: int
    image_url: str
    display_order: int

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None


class CommentSchema(BaseModel):
    id: int
    post_id: int
    user_id: int
    username: str
    user_avatar: Optional[str] = None
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class PostResponse(BaseModel):
    id: int
    user_id: int
    username: str
    user_avatar: Optional[str] = None
    caption: str
    location: str
    images: List[PostImageSchema] = []
    likes_count: int = 0
    comments_count: int = 0
    is_liked: bool = False
    is_bookmarked: bool = False
    comments: List[CommentSchema] = []
    created_at: datetime

    class Config:
        from_attributes = True

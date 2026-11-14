from pydantic import BaseModel

from app.schemas.common import UTCDateTime
from app.schemas.post import HashtagOut
from app.schemas.user import UserListItem, UserPublic


class StoryOut(BaseModel):
    id: int
    image_url: str
    created_at: UTCDateTime


class StoryGroup(BaseModel):
    user: UserPublic
    stories: list[StoryOut]


class NotificationOut(BaseModel):
    id: int
    type: str
    actor: UserListItem
    post_id: int | None
    post_thumbnail: str | None
    comment_text: str | None
    is_read: bool
    created_at: UTCDateTime


class SearchResult(BaseModel):
    users: list[UserPublic]
    hashtags: list[HashtagOut]

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import UTCDateTime
from app.schemas.user import UserPublic, USERNAME_PATTERN


class MessageIn(BaseModel):
    content: str = Field(min_length=1, max_length=1000)

    @field_validator("content", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v


class StartConversationIn(BaseModel):
    username: str = Field(pattern=USERNAME_PATTERN)

    @field_validator("username", mode="before")
    @classmethod
    def _lower(cls, v):
        return v.strip().lower() if isinstance(v, str) else v


class MessageOut(BaseModel):
    id: int
    content: str
    created_at: UTCDateTime
    is_mine: bool


class ConversationOut(BaseModel):
    id: int
    other_user: UserPublic
    last_message: MessageOut | None
    unread_count: int
    # Highest of my message ids the other person has read (for the "읽음" marker).
    other_last_read_id: int

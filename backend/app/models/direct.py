from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._base import utcnow


class Conversation(Base):
    """One-on-one direct message thread. The pair is stored ordered (user_a_id < user_b_id) so it is unique."""

    __tablename__ = "conversations"
    __table_args__ = (
        CheckConstraint("user_a_id < user_b_id", name="ck_conversation_order"),
        UniqueConstraint("user_a_id", "user_b_id", name="uq_conversation_pair"),
        Index("ix_conversations_user_b", "user_b_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_a_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user_b_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # Highest message id each side has seen (0 = nothing read yet).
    a_last_read_id: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    b_last_read_id: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)

    user_a = relationship("User", foreign_keys=[user_a_id])
    user_b = relationship("User", foreign_keys=[user_b_id])

    def other_id(self, user_id: int) -> int:
        return self.user_b_id if user_id == self.user_a_id else self.user_a_id

    def other(self, user_id: int):
        return self.user_b if user_id == self.user_a_id else self.user_a

    def last_read_id(self, user_id: int) -> int:
        return self.a_last_read_id if user_id == self.user_a_id else self.b_last_read_id

    def set_last_read_id(self, user_id: int, message_id: int) -> None:
        if user_id == self.user_a_id:
            self.a_last_read_id = max(self.a_last_read_id, message_id)
        else:
            self.b_last_read_id = max(self.b_last_read_id, message_id)


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (Index("ix_messages_conversation_id", "conversation_id", "id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

"""Direct messages (1:1 chat). The client polls for new messages with `after_id`."""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import DB, CurrentUser
from app.models import Conversation, Message, User
from app.models._base import utcnow
from app.schemas.direct import ConversationOut, MessageIn, MessageOut, StartConversationIn
from app.schemas.user import UserPublic
from app.services.social import get_user_or_404

router = APIRouter(prefix="/direct", tags=["direct"])


def _mine(me_id: int):
    return or_(Conversation.user_a_id == me_id, Conversation.user_b_id == me_id)


def _get_conversation_or_404(db: Session, me: User, conversation_id: int) -> Conversation:
    conv = db.scalar(
        select(Conversation)
        .options(selectinload(Conversation.user_a), selectinload(Conversation.user_b))
        .where(Conversation.id == conversation_id, _mine(me.id))
    )
    if not conv:
        raise HTTPException(404, "대화를 찾을 수 없습니다.")
    return conv


def _message_out(m: Message, me_id: int) -> MessageOut:
    return MessageOut(id=m.id, content=m.content, created_at=m.created_at, is_mine=m.sender_id == me_id)


def _unread_counts(db: Session, me: User, convs: list[Conversation]) -> dict[int, int]:
    """Messages from the other person newer than my last-read id, per conversation."""
    if not convs:
        return {}
    conds = [and_(Message.conversation_id == c.id, Message.id > c.last_read_id(me.id)) for c in convs]
    rows = db.execute(
        select(Message.conversation_id, func.count())
        .where(Message.sender_id != me.id, or_(*conds))
        .group_by(Message.conversation_id)
    ).all()
    return dict(rows)


def _conversation_out(c: Conversation, me: User, last: Message | None, unread: int) -> ConversationOut:
    return ConversationOut(
        id=c.id, other_user=UserPublic.model_validate(c.other(me.id)),
        last_message=_message_out(last, me.id) if last else None, unread_count=unread,
        other_last_read_id=c.last_read_id(c.other_id(me.id)),
    )


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(db: DB, me: CurrentUser):
    """My conversations that have at least one message, newest first."""
    convs = db.scalars(
        select(Conversation)
        .options(selectinload(Conversation.user_a), selectinload(Conversation.user_b))
        .where(_mine(me.id), Conversation.last_message_at.is_not(None))
        .order_by(Conversation.last_message_at.desc())
        .limit(100)
    ).all()
    if not convs:
        return []
    last_ids = select(func.max(Message.id)).where(Message.conversation_id.in_([c.id for c in convs])) \
        .group_by(Message.conversation_id)
    last = {m.conversation_id: m for m in db.scalars(select(Message).where(Message.id.in_(last_ids)))}
    unread = _unread_counts(db, me, convs)
    return [_conversation_out(c, me, last.get(c.id), unread.get(c.id, 0)) for c in convs]


@router.post("/conversations", response_model=ConversationOut)
def start_conversation(body: StartConversationIn, db: DB, me: CurrentUser):
    """Open (or create) the thread with another user."""
    other = get_user_or_404(db, body.username)
    if other.id == me.id:
        raise HTTPException(400, "자기 자신에게는 메시지를 보낼 수 없습니다.")
    a, b = sorted((me.id, other.id))
    conv = db.scalar(select(Conversation).where(Conversation.user_a_id == a, Conversation.user_b_id == b))
    if not conv:
        conv = Conversation(user_a_id=a, user_b_id=b)
        db.add(conv)
        db.commit()
    conv = _get_conversation_or_404(db, me, conv.id)
    last = db.scalar(select(Message).where(Message.conversation_id == conv.id).order_by(Message.id.desc()).limit(1))
    return _conversation_out(conv, me, last, _unread_counts(db, me, [conv]).get(conv.id, 0))


@router.get("/conversations/{conversation_id}", response_model=ConversationOut)
def get_conversation(conversation_id: int, db: DB, me: CurrentUser):
    conv = _get_conversation_or_404(db, me, conversation_id)
    last = db.scalar(select(Message).where(Message.conversation_id == conv.id).order_by(Message.id.desc()).limit(1))
    return _conversation_out(conv, me, last, _unread_counts(db, me, [conv]).get(conv.id, 0))


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def list_messages(conversation_id: int, db: DB, me: CurrentUser,
                  after_id: int | None = None, before_id: int | None = None, limit: int = 50):
    """Messages in ascending order. `after_id` → new messages (polling); `before_id` → older page."""
    _get_conversation_or_404(db, me, conversation_id)
    limit = max(1, min(limit, 100))
    q = select(Message).where(Message.conversation_id == conversation_id)
    if after_id is not None:
        rows = db.scalars(q.where(Message.id > after_id).order_by(Message.id.asc()).limit(limit)).all()
    else:
        if before_id is not None:
            q = q.where(Message.id < before_id)
        rows = list(reversed(db.scalars(q.order_by(Message.id.desc()).limit(limit)).all()))
    return [_message_out(m, me.id) for m in rows]


@router.post("/conversations/{conversation_id}/messages", response_model=MessageOut,
             status_code=status.HTTP_201_CREATED)
def send_message(conversation_id: int, body: MessageIn, db: DB, me: CurrentUser):
    conv = _get_conversation_or_404(db, me, conversation_id)
    m = Message(conversation_id=conv.id, sender_id=me.id, content=body.content)
    db.add(m)
    db.flush()
    conv.last_message_at = m.created_at or utcnow()
    conv.set_last_read_id(me.id, m.id)  # my own message counts as read for me
    db.commit()
    db.refresh(m)
    return _message_out(m, me.id)


@router.post("/conversations/{conversation_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_read(conversation_id: int, db: DB, me: CurrentUser):
    conv = _get_conversation_or_404(db, me, conversation_id)
    latest = db.scalar(select(func.max(Message.id)).where(Message.conversation_id == conv.id))
    if latest:
        conv.set_last_read_id(me.id, latest)
        db.commit()


@router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def unsend_message(message_id: int, db: DB, me: CurrentUser):
    """Unsend (delete) one of my own messages."""
    m = db.get(Message, message_id)
    if not m or m.sender_id != me.id:
        raise HTTPException(404, "메시지를 찾을 수 없습니다.")
    conv = db.get(Conversation, m.conversation_id)
    db.delete(m)
    db.flush()
    conv.last_message_at = db.scalar(
        select(Message.created_at).where(Message.conversation_id == conv.id).order_by(Message.id.desc()).limit(1))
    db.commit()


@router.get("/unread-count")
def unread_count(db: DB, me: CurrentUser) -> dict:
    """Number of conversations with unread messages (what the nav badge shows)."""
    convs = db.scalars(select(Conversation).where(_mine(me.id), Conversation.last_message_at.is_not(None))).all()
    counts = _unread_counts(db, me, list(convs))
    return {"count": sum(1 for n in counts.values() if n > 0)}

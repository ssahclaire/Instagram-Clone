from datetime import timedelta

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DB, CurrentUser, OptionalUser
from app.core.config import settings
from app.models import Story
from app.models._base import utcnow
from app.schemas.social import StoryGroup, StoryOut
from app.schemas.user import UserPublic
from app.services.files import delete_image, save_image
from app.services.social import following_ids_subquery, public_user_ids

router = APIRouter(prefix="/stories", tags=["stories"])


@router.get("/feed", response_model=list[StoryGroup])
def story_feed(db: DB, me: OptionalUser):
    """Active stories of me + accounts I follow, grouped per user (mine first). Guest: public accounts."""
    if me is None:
        who = Story.user_id.in_(public_user_ids())
    else:
        who = (Story.user_id == me.id) | Story.user_id.in_(following_ids_subquery(me.id))
    stories = db.scalars(
        select(Story).options(selectinload(Story.author))
        .where(Story.expires_at > utcnow(), who)
        .order_by(Story.created_at)
    ).all()
    groups: dict[int, StoryGroup] = {}
    for s in stories:
        g = groups.setdefault(s.user_id, StoryGroup(user=UserPublic.model_validate(s.author), stories=[]))
        g.stories.append(StoryOut(id=s.id, image_url=s.image_url, created_at=s.created_at))
    my_id = me.id if me else None
    ordered = sorted(groups.values(), key=lambda g: (g.user.id != my_id, -g.stories[-1].created_at.timestamp()))
    return ordered


@router.post("", response_model=StoryOut, status_code=status.HTTP_201_CREATED)
async def create_story(db: DB, me: CurrentUser, file: UploadFile = File(...)):
    url = await save_image(file, "stories")
    now = utcnow()
    story = Story(user_id=me.id, image_url=url, created_at=now,
                  expires_at=now + timedelta(hours=settings.STORY_TTL_HOURS))
    db.add(story)
    db.commit()
    return StoryOut(id=story.id, image_url=story.image_url, created_at=story.created_at)


@router.delete("/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_story(story_id: int, db: DB, me: CurrentUser):
    story = db.get(Story, story_id)
    if not story or story.user_id != me.id:
        raise HTTPException(404, "스토리를 찾을 수 없습니다.")
    url = story.image_url
    db.delete(story)
    db.commit()
    delete_image(url)


def purge_expired_stories(db) -> int:
    expired = db.scalars(select(Story).where(Story.expires_at <= utcnow())).all()
    for s in expired:
        delete_image(s.image_url)
        db.delete(s)
    db.commit()
    return len(expired)

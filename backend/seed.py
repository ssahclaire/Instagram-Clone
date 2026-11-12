"""Populate the database with demo users/posts so the UI isn't empty.

Usage (from backend/):  python seed.py          # adds demo data if 'demo' user doesn't exist
                        python seed.py --reset  # deletes instagram.db + uploads first
All demo accounts use password: password123
"""
import io
import random
import shutil
import sys
from datetime import timedelta

from PIL import Image, ImageDraw

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models import Bookmark, Comment, Follow, Post, PostImage, PostLike, Story, User
from app.models._base import utcnow
from app.services.files import ensure_upload_dirs
from app.services.social import notify, sync_hashtags

USERS = [
    ("demo", "데모 사용자", "인스타그램 클론 데모 계정입니다 👋\n서울 · 사진 · 여행", "https://example.com", False),
    ("jisoo.travel", "김지수", "✈️ 여행 기록\n📍 지금은 제주", "", False),
    ("minho_cook", "이민호", "🍳 매일 집밥\n레시피 DM 환영", "https://minho.kitchen", False),
    ("haeun.art", "박하은", "🎨 일러스트레이터", "", False),
    ("private.yuna", "최유나", "비공개 계정입니다 🔒", "", True),
    ("seoul_cafe", "서울카페투어", "☕ 서울 카페 큐레이션", "", False),
]

CAPTIONS = [
    "오늘의 하늘 ☁️ #하늘 #일상 #서울",
    "주말 브런치 🥞 #브런치 #맛집 #주말",
    "바다 보러 왔어요 🌊 #제주 #여행 #바다",
    "새 작업 완성! #그림 #일러스트",
    "퇴근길 노을 #노을 #서울",
    "오늘의 커피 ☕ #커피 #카페",
    "산책하기 좋은 날 🌿 #산책 #자연",
    "집밥 최고 🍚 #집밥 #맛집",
]
LOCATIONS = ["서울특별시", "제주도", "부산 해운대", "성수동", "", "한강공원"]
COMMENTS = ["멋져요! 😍", "어디예요?", "와 대박", "저도 가보고 싶어요", "👏👏", "색감 너무 좋아요"]


def gradient_image(seed: int, w=1080, h=1080) -> Image.Image:
    rnd = random.Random(seed)
    c1 = [rnd.randint(40, 255) for _ in range(3)]
    c2 = [rnd.randint(40, 255) for _ in range(3)]
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        draw.line([(0, y), (w, y)], fill=tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3)))
    for _ in range(rnd.randint(2, 5)):
        r = rnd.randint(60, 260)
        x, y = rnd.randint(0, w), rnd.randint(0, h)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=tuple(rnd.randint(0, 255) for _ in range(3)))
    return img


def save(img: Image.Image, kind: str, name: str) -> str:
    folder = settings.upload_path / kind
    folder.mkdir(parents=True, exist_ok=True)
    img.save(folder / name, "JPEG", quality=85)
    return f"/static/uploads/{kind}/{name}"


def main():
    if "--reset" in sys.argv:
        engine.dispose()
        db_file = settings.database_url.replace("sqlite:///", "")
        for suffix in ("", "-wal", "-shm"):
            try:
                import os
                os.remove(db_file + suffix)
            except FileNotFoundError:
                pass
        for kind in ("profiles", "posts", "stories"):
            shutil.rmtree(settings.upload_path / kind, ignore_errors=True)

    ensure_upload_dirs()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    if db.query(User).filter_by(username="demo").first():
        print("데모 데이터가 이미 있습니다. 다시 만들려면 --reset 옵션을 사용하세요.")
        return

    rnd = random.Random(42)
    pw = hash_password("password123")
    users = []
    for i, (username, name, bio, web, private) in enumerate(USERS):
        avatar = gradient_image(1000 + i, 320, 320)
        u = User(username=username, email=f"{username.replace('.', '_')}@example.com", full_name=name, bio=bio,
                 website=web, is_private=private, hashed_password=pw,
                 profile_image_url=save(avatar, "profiles", f"seed_{username}.jpg"))
        db.add(u)
        users.append(u)
    db.flush()

    demo = users[0]
    for other in users[1:4]:
        db.add(Follow(follower_id=demo.id, following_id=other.id))
        db.add(Follow(follower_id=other.id, following_id=demo.id))
    db.add(Follow(follower_id=users[5].id, following_id=demo.id))
    db.add(Follow(follower_id=users[4].id, following_id=demo.id))
    db.add(Follow(follower_id=demo.id, following_id=users[4].id, status="pending"))

    posts = []
    now = utcnow()
    for n in range(18):
        author = users[n % len(users)]
        p = Post(user_id=author.id, caption=rnd.choice(CAPTIONS), location=rnd.choice(LOCATIONS),
                 created_at=now - timedelta(hours=n * 7 + rnd.randint(0, 5)))
        p.images = [PostImage(image_url=save(gradient_image(n * 10 + k), "posts", f"seed_{n}_{k}.jpg"), display_order=k)
                    for k in range(rnd.choice([1, 1, 2, 3]))]
        db.add(p)
        db.flush()
        sync_hashtags(db, p)
        posts.append(p)

    for p in posts:
        for u in rnd.sample(users, rnd.randint(0, len(users))):
            db.add(PostLike(user_id=u.id, post_id=p.id))
            notify(db, recipient_id=p.user_id, actor_id=u.id, type="like", post_id=p.id)
        for _ in range(rnd.randint(0, 3)):
            u = rnd.choice(users)
            c = Comment(post_id=p.id, user_id=u.id, content=rnd.choice(COMMENTS))
            db.add(c)
            db.flush()
            notify(db, recipient_id=p.user_id, actor_id=u.id, type="comment", post_id=p.id, comment_id=c.id)
    for p in posts[1:4]:
        db.add(Bookmark(user_id=demo.id, post_id=p.id))

    for i, u in enumerate(users[1:4]):
        db.add(Story(user_id=u.id, image_url=save(gradient_image(500 + i, 1080, 1920), "stories", f"seed_{i}.jpg"),
                     created_at=now - timedelta(hours=i + 1), expires_at=now + timedelta(hours=23 - i)))

    db.commit()
    print(f"데모 데이터 생성 완료: 사용자 {len(users)}명, 게시물 {len(posts)}개. 로그인: demo / password123")


if __name__ == "__main__":
    main()

"""Populate the database with demo users/posts so the UI isn't empty.

Usage (from backend/):  python seed.py          # adds demo data if 'demo' user doesn't exist
                        python seed.py --reset  # deletes instagram.db + uploads first
All demo accounts use password: password123

Test account (created separately, so it is also added to an existing database):
    email test@gmail.com / username test / password 12345
    (Inserted directly, so it skips the 8-character minimum the signup API enforces.)
"""
import io
import random
import shutil
import sys
from datetime import timedelta

from PIL import Image, ImageDraw

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.migrations import run_migrations
from app.core.security import hash_password
from app.models import Bookmark, Comment, Conversation, Follow, Message, Post, PostImage, PostLike, Story, User
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


TEST_EMAIL = "test@gmail.com"
TEST_USERNAME = "test"
TEST_PASSWORD = "12345"


def seed_test_user(db) -> None:
    """Add a login for manual testing, linked to the demo users so every page has data."""
    if db.query(User).filter_by(email=TEST_EMAIL).first():
        print(f"테스트 계정이 이미 있습니다: {TEST_EMAIL}")
        return
    others = {u.username: u for u in db.query(User).filter(User.username.in_([u[0] for u in USERS])).all()}

    me = User(username=TEST_USERNAME, email=TEST_EMAIL, full_name="테스트 사용자", bio="테스트 계정입니다 🧪",
              website="", is_private=False, hashed_password=hash_password(TEST_PASSWORD),
              profile_image_url=save(gradient_image(2000, 320, 320), "profiles", "seed_test.jpg"))
    db.add(me)
    db.flush()

    # Following / followers (accepted), a request sent to the private account, and one received request.
    for name in ("demo", "jisoo.travel", "minho_cook", "haeun.art", "seoul_cafe"):
        if name in others:
            db.add(Follow(follower_id=me.id, following_id=others[name].id))
    for name in ("demo", "jisoo.travel", "haeun.art"):
        if name in others:
            db.add(Follow(follower_id=others[name].id, following_id=me.id))
            notify(db, recipient_id=me.id, actor_id=others[name].id, type="follow")
    if "private.yuna" in others:
        db.add(Follow(follower_id=me.id, following_id=others["private.yuna"].id, status="pending"))
    if "minho_cook" in others:
        db.add(Follow(follower_id=others["minho_cook"].id, following_id=me.id, status="pending"))
        notify(db, recipient_id=me.id, actor_id=others["minho_cook"].id, type="follow_request")

    # Own posts, with likes and comments from the demo users (shows up in notifications).
    now = utcnow()
    fans = [others[n] for n in ("demo", "jisoo.travel", "haeun.art") if n in others]
    for n, caption in enumerate(["테스트 게시물입니다 #테스트 #일상", "두 번째 테스트 게시물 📸 #테스트"]):
        p = Post(user_id=me.id, caption=caption, location="서울특별시", created_at=now - timedelta(hours=n * 3 + 1))
        p.images = [PostImage(image_url=save(gradient_image(2100 + n * 10 + k), "posts", f"seed_test_{n}_{k}.jpg"),
                              display_order=k) for k in range(n + 1)]
        db.add(p)
        db.flush()
        sync_hashtags(db, p)
        for u in fans:
            db.add(PostLike(user_id=u.id, post_id=p.id))
            notify(db, recipient_id=me.id, actor_id=u.id, type="like", post_id=p.id)
        if fans:
            c = Comment(post_id=p.id, user_id=fans[0].id, content=COMMENTS[n])
            db.add(c)
            db.flush()
            notify(db, recipient_id=me.id, actor_id=fans[0].id, type="comment", post_id=p.id, comment_id=c.id)

    # Saved posts.
    for p in db.query(Post).filter(Post.user_id != me.id).order_by(Post.created_at.desc()).limit(3):
        db.add(Bookmark(user_id=me.id, post_id=p.id))

    db.commit()
    print(f"테스트 계정 생성 완료: {TEST_EMAIL} / {TEST_PASSWORD}")


# (username, username, [(sender index 0/1, minutes ago, text)], whether the 2nd user has read everything)
CONVERSATIONS = [
    ("test", "demo", [
        (1, 180, "안녕하세요! 테스트 계정이시죠? 👋"),
        (0, 175, "네 맞아요, 채팅 기능 확인 중이에요"),
        (1, 170, "잘 되나요?"),
        (0, 30, "네! 메시지가 잘 보이네요"),
        (1, 5, "다행이에요 😄 사진도 잘 봤어요"),
    ], False),
    ("test", "jisoo.travel", [
        (1, 60 * 26, "제주 사진 보셨어요? 🌊"),
        (0, 60 * 25, "봤어요! 너무 예쁘던데요"),
        (1, 60 * 25 - 3, "다음엔 같이 가요 ✈️"),
        (0, 60 * 24, "좋아요!"),
    ], True),
    ("demo", "minho_cook", [
        (1, 90, "레시피 공유해 드릴까요?"),
        (0, 80, "네 부탁드려요 🍳"),
    ], True),
]


def seed_conversations(db) -> None:
    """Sample direct messages (only when there are none yet)."""
    if db.query(Conversation).first():
        return
    by_name = {u.username: u for u in db.query(User).all()}
    now = utcnow()
    made = 0
    for name1, name2, lines, second_read in CONVERSATIONS:
        u1, u2 = by_name.get(name1), by_name.get(name2)
        if not u1 or not u2:
            continue
        a, b = sorted((u1.id, u2.id))
        conv = Conversation(user_a_id=a, user_b_id=b)
        db.add(conv)
        db.flush()
        last_read = {u1.id: 0, u2.id: 0}
        msg = None
        for who, minutes_ago, text in lines:
            sender = (u1, u2)[who]
            msg = Message(conversation_id=conv.id, sender_id=sender.id, content=text,
                          created_at=now - timedelta(minutes=minutes_ago))
            db.add(msg)
            db.flush()
            last_read[sender.id] = msg.id
        # The first user has read up to their own last message; the second read everything if second_read.
        if second_read:
            last_read[u2.id] = msg.id
        conv.a_last_read_id, conv.b_last_read_id = last_read[a], last_read[b]
        conv.last_message_at = msg.created_at
        made += 1
    db.commit()
    print(f"샘플 대화 생성 완료: {made}개")


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
    run_migrations(engine)  # an older instagram.db may still have removed columns
    db = SessionLocal()
    if db.query(User).filter_by(username="demo").first():
        print("데모 데이터가 이미 있습니다. 다시 만들려면 --reset 옵션을 사용하세요.")
        seed_test_user(db)
        seed_conversations(db)
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
    seed_test_user(db)
    seed_conversations(db)


if __name__ == "__main__":
    main()

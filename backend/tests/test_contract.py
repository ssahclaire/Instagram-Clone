"""Response shapes = exactly what the frontend reads (backend.md §5). A new field needs a screen that uses it."""
from tests.conftest import make_image, register

API = "/api/v1"

USER_PUBLIC = {"id", "username", "full_name", "profile_image_url", "is_private"}
USER_ME = USER_PUBLIC | {"bio", "website"}
USER_LIST_ITEM = USER_PUBLIC | {"follow_status", "is_me"}
POST_OUT = {"id", "author", "caption", "location", "images", "like_count", "comment_count",
            "is_liked", "is_bookmarked", "created_at"}
COMMENT_OUT = {"id", "parent_id", "author", "content", "created_at"}
MESSAGE_OUT = {"id", "content", "created_at", "is_mine"}
CONVERSATION_OUT = {"id", "other_user", "last_message", "unread_count", "other_last_read_id"}


def test_response_shapes(client):
    h = register(client, "shape_a")
    hb = register(client, "shape_b")

    tok = client.post(f"{API}/auth/login", json={"username": "shape_a", "password": "password123"}).json()
    assert set(tok) == {"access_token", "token_type", "user"} and set(tok["user"]) == USER_ME
    assert set(client.get(f"{API}/auth/me", headers=h).json()) == USER_ME

    post = client.post(f"{API}/posts", headers=h, files=[("files", ("a.png", make_image(), "image/png"))],
                       data={"caption": "모양 #shape", "location": ""}).json()
    assert set(post) == POST_OUT
    assert set(post["author"]) == USER_PUBLIC and set(post["images"][0]) == {"id", "image_url"}

    c = client.post(f"{API}/posts/{post['id']}/comments", headers=hb, json={"content": "hi"}).json()
    assert set(c) == COMMENT_OUT

    client.post(f"{API}/posts/{post['id']}/like", headers=hb)
    assert set(client.get(f"{API}/posts/{post['id']}/likes", headers=h).json()[0]) == USER_LIST_ITEM

    story = client.post(f"{API}/stories", headers=h, files={"file": ("s.png", make_image(), "image/png")}).json()
    assert set(story) == {"id", "image_url", "created_at"}

    notif = client.get(f"{API}/notifications", headers=h).json()[0]
    assert set(notif) == {"id", "type", "actor", "post_id", "post_thumbnail", "comment_text", "is_read", "created_at"}

    conv = client.post(f"{API}/direct/conversations", headers=h, json={"username": "shape_b"}).json()
    assert set(conv) == CONVERSATION_OUT and set(conv["other_user"]) == USER_PUBLIC
    m = client.post(f"{API}/direct/conversations/{conv['id']}/messages", headers=h, json={"content": "x"}).json()
    assert set(m) == MESSAGE_OUT


def test_long_hashtags_are_not_stored(client):
    """hashtags.name is VARCHAR(100); SQLite doesn't enforce lengths, so the app skips longer tags."""
    h = register(client, "tag_len")
    long_tag = "a" * 101
    client.post(f"{API}/posts", headers=h, files=[("files", ("a.png", make_image(), "image/png"))],
                data={"caption": f"#ok_tag #{long_tag}", "location": ""})
    assert client.get(f"{API}/posts/tags/ok_tag").json()
    assert client.get(f"{API}/posts/tags/{long_tag}").json() == []

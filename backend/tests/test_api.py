from tests.conftest import make_image, register

API = "/api/v1"


def test_auth_flow(client):
    h = register(client, "alice")
    # duplicate username / email -> 409
    r = client.post(f"{API}/auth/register", json={"email": "alice@example.com", "username": "alice2", "password": "password123"})
    assert r.status_code == 409
    r = client.post(f"{API}/auth/register", json={"email": "x@example.com", "username": "alice", "password": "password123"})
    assert r.status_code == 409
    # invalid username
    r = client.post(f"{API}/auth/register", json={"email": "y@example.com", "username": "Bad Name!", "password": "password123"})
    assert r.status_code == 422
    # login with username and with email
    assert client.post(f"{API}/auth/login", json={"username": "alice", "password": "password123"}).status_code == 200
    assert client.post(f"{API}/auth/login", json={"username": "ALICE@example.com", "password": "password123"}).status_code == 200
    r = client.post(f"{API}/auth/login", json={"username": "alice", "password": "wrong"})
    assert r.status_code == 401 and "일치하지" in r.json()["detail"]
    assert client.get(f"{API}/auth/me", headers=h).json()["username"] == "alice"
    assert client.get(f"{API}/auth/me", headers={"Authorization": "Bearer junk"}).status_code == 401


def test_profile_avatar_password(client):
    h = register(client, "bob")
    r = client.put(f"{API}/users/me/profile", headers=h,
                   json={"full_name": "Bob B", "bio": "line1\nline2", "website": "bob.dev"})
    assert r.status_code == 200 and r.json()["website"] == "https://bob.dev"
    assert client.put(f"{API}/users/me/profile", headers=h, json={"username": "alice"}).status_code == 409
    assert client.put(f"{API}/users/me/profile", headers=h, json={"bio": "x" * 151}).status_code == 422

    r = client.post(f"{API}/users/me/avatar", headers=h, files={"file": ("a.png", make_image(), "image/png")})
    assert r.status_code == 200
    url = r.json()["profile_image_url"]
    assert url.startswith("/static/uploads/profiles/")
    assert client.get(url).status_code == 200
    r = client.post(f"{API}/users/me/avatar", headers=h, files={"file": ("a.txt", b"not image", "text/plain")})
    assert r.status_code == 400
    assert client.delete(f"{API}/users/me/avatar", headers=h).json()["profile_image_url"] is None
    assert client.get(url).status_code == 404  # file removed

    assert client.put(f"{API}/users/me/password", headers=h,
                      json={"current_password": "nope", "new_password": "newpassword1"}).status_code == 400
    assert client.put(f"{API}/users/me/password", headers=h,
                      json={"current_password": "password123", "new_password": "newpassword1"}).status_code == 204
    assert client.post(f"{API}/auth/login", json={"username": "bob", "password": "newpassword1"}).status_code == 200


def test_posts_social(client):
    ha = register(client, "carol")
    hb = register(client, "dave")

    files = [("files", ("1.png", make_image((255, 0, 0)), "image/png")),
             ("files", ("2.png", make_image((0, 255, 0)), "image/png"))]
    r = client.post(f"{API}/posts", headers=ha, files=files, data={"caption": "Hello #Sunset #seoul", "location": "Seoul"})
    assert r.status_code == 201, r.text
    post = r.json()
    assert len(post["images"]) == 2 and post["author"]["username"] == "carol"
    pid = post["id"]

    # dave doesn't follow yet: not in feed, but in explore (public)
    assert all(p["id"] != pid for p in client.get(f"{API}/posts/feed", headers=hb).json())
    assert any(p["id"] == pid for p in client.get(f"{API}/posts/explore", headers=hb).json())
    assert client.post(f"{API}/users/carol/follow", headers=hb).json()["follow_status"] == "accepted"
    assert any(p["id"] == pid for p in client.get(f"{API}/posts/feed", headers=hb).json())

    # like / bookmark toggles
    r = client.post(f"{API}/posts/{pid}/like", headers=hb).json()
    assert r == {"liked": True, "like_count": 1}
    assert client.post(f"{API}/posts/{pid}/bookmark", headers=hb).json()["bookmarked"] is True
    assert [p["id"] for p in client.get(f"{API}/users/me/saved", headers=hb).json()] == [pid]
    got = client.get(f"{API}/posts/{pid}", headers=hb).json()
    assert got["is_liked"] and got["is_bookmarked"] and got["like_count"] == 1

    # comments + reply
    c1 = client.post(f"{API}/posts/{pid}/comments", headers=hb, json={"content": "nice!"}).json()
    c2 = client.post(f"{API}/posts/{pid}/comments", headers=ha, json={"content": "thanks", "parent_id": c1["id"]}).json()
    assert c2["parent_id"] == c1["id"]
    assert len(client.get(f"{API}/posts/{pid}/comments", headers=ha).json()) == 2
    # post owner can delete dave's comment (cascades the reply)
    assert client.delete(f"{API}/posts/comments/{c1['id']}", headers=ha).status_code == 204
    assert client.get(f"{API}/posts/{pid}/comments", headers=ha).json() == []

    # notifications for carol: follow + like (+ comment removed by cascade)
    n = client.get(f"{API}/notifications", headers=ha).json()
    assert {x["type"] for x in n} >= {"follow", "like"}
    assert client.get(f"{API}/notifications/unread-count", headers=ha).json()["count"] >= 2
    client.post(f"{API}/notifications/read-all", headers=ha)
    assert client.get(f"{API}/notifications/unread-count", headers=ha).json()["count"] == 0

    # hashtags + search
    assert [p["id"] for p in client.get(f"{API}/posts/tags/sunset", headers=hb).json()] == [pid]
    s = client.get(f"{API}/search", params={"q": "car"}, headers=hb).json()
    assert any(u["username"] == "carol" for u in s["users"])
    s = client.get(f"{API}/search", params={"q": "#sun"}, headers=hb).json()
    assert s["users"] == [] and s["hashtags"][0] == {"name": "sunset", "post_count": 1}

    # edit + profile counters
    assert client.put(f"{API}/posts/{pid}", headers=hb, json={"caption": "hack"}).status_code == 403
    assert client.put(f"{API}/posts/{pid}", headers=ha, json={"caption": "#new"}).json()["caption"] == "#new"
    assert client.get(f"{API}/posts/tags/sunset", headers=hb).json() == []
    prof = client.get(f"{API}/users/carol", headers=hb).json()
    assert prof["post_count"] == 1 and prof["follower_count"] == 1 and prof["follow_status"] == "accepted"

    # delete
    assert client.delete(f"{API}/posts/{pid}", headers=hb).status_code == 403
    assert client.delete(f"{API}/posts/{pid}", headers=ha).status_code == 204
    assert client.get(f"{API}/posts/{pid}", headers=ha).status_code == 404


def test_private_account(client):
    hp = register(client, "erin", private=True)
    hv = register(client, "frank")
    r = client.post(f"{API}/posts", headers=hp, files=[("files", ("x.png", make_image(), "image/png"))])
    pid = r.json()["id"]

    prof = client.get(f"{API}/users/erin", headers=hv).json()
    assert prof["can_view_posts"] is False
    assert client.get(f"{API}/users/erin/posts", headers=hv).status_code == 403
    assert client.get(f"{API}/posts/{pid}", headers=hv).status_code == 404
    assert all(p["id"] != pid for p in client.get(f"{API}/posts/explore", headers=hv).json())

    assert client.post(f"{API}/users/erin/follow", headers=hv).json()["follow_status"] == "pending"
    reqs = client.get(f"{API}/users/me/follow-requests", headers=hp).json()
    assert [u["username"] for u in reqs] == ["frank"]
    assert client.post(f"{API}/users/me/follow-requests/frank/accept", headers=hp).status_code == 204
    assert client.get(f"{API}/posts/{pid}", headers=hv).status_code == 200
    assert client.get(f"{API}/users/erin/followers", headers=hv).json()[0]["username"] == "frank"


def test_stories(client):
    h1 = register(client, "gina")
    h2 = register(client, "hank")
    client.post(f"{API}/users/gina/follow", headers=h2)
    r = client.post(f"{API}/stories", headers=h1, files={"file": ("s.png", make_image(), "image/png")})
    assert r.status_code == 201
    groups = client.get(f"{API}/stories/feed", headers=h2).json()
    assert groups[0]["user"]["username"] == "gina" and len(groups[0]["stories"]) == 1
    assert client.delete(f"{API}/stories/{r.json()['id']}", headers=h2).status_code == 404
    assert client.delete(f"{API}/stories/{r.json()['id']}", headers=h1).status_code == 204

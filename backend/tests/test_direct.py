from tests.conftest import register

API = "/api/v1/direct"


def test_direct_messages_flow(client):
    ha = register(client, "dm_amy")
    hb = register(client, "dm_ben")
    hc = register(client, "dm_cat")

    # can't message yourself / unknown users
    assert client.post(f"{API}/conversations", headers=ha, json={"username": "dm_amy"}).status_code == 400
    assert client.post(f"{API}/conversations", headers=ha, json={"username": "nobody_here"}).status_code == 404
    assert client.get(f"{API}/conversations").status_code == 401

    # get-or-create returns the same thread from either side
    r = client.post(f"{API}/conversations", headers=ha, json={"username": "DM_Ben"})
    assert r.status_code == 200, r.text
    conv = r.json()
    cid = conv["id"]
    assert conv["other_user"]["username"] == "dm_ben" and conv["last_message"] is None
    assert client.post(f"{API}/conversations", headers=hb, json={"username": "dm_amy"}).json()["id"] == cid

    # empty threads stay out of the inbox
    assert client.get(f"{API}/conversations", headers=ha).json() == []

    # send
    assert client.post(f"{API}/conversations/{cid}/messages", headers=ha, json={"content": "   "}).status_code == 422
    assert client.post(f"{API}/conversations/{cid}/messages", headers=ha, json={"content": "x" * 1001}).status_code == 422
    m1 = client.post(f"{API}/conversations/{cid}/messages", headers=ha, json={"content": " 안녕! "}).json()
    m2 = client.post(f"{API}/conversations/{cid}/messages", headers=ha, json={"content": "뭐 해?"}).json()
    assert m1["content"] == "안녕!" and m1["is_mine"] is True

    # outsiders can't read or post
    assert client.get(f"{API}/conversations/{cid}/messages", headers=hc).status_code == 404
    assert client.post(f"{API}/conversations/{cid}/messages", headers=hc, json={"content": "hi"}).status_code == 404

    # recipient sees unread
    assert client.get(f"{API}/unread-count", headers=hb).json()["count"] == 1
    assert client.get(f"{API}/unread-count", headers=ha).json()["count"] == 0
    inbox = client.get(f"{API}/conversations", headers=hb).json()
    assert len(inbox) == 1 and inbox[0]["unread_count"] == 2
    assert inbox[0]["last_message"]["content"] == "뭐 해?" and inbox[0]["last_message"]["is_mine"] is False

    # history & polling
    msgs = client.get(f"{API}/conversations/{cid}/messages", headers=hb).json()
    assert [m["id"] for m in msgs] == [m1["id"], m2["id"]] and msgs[0]["is_mine"] is False
    assert client.get(f"{API}/conversations/{cid}/messages", headers=hb, params={"after_id": m2["id"]}).json() == []
    older = client.get(f"{API}/conversations/{cid}/messages", headers=hb, params={"before_id": m2["id"]}).json()
    assert [m["id"] for m in older] == [m1["id"]]

    # read receipts
    assert client.get(f"{API}/conversations/{cid}", headers=ha).json()["other_last_read_id"] == 0
    assert client.post(f"{API}/conversations/{cid}/read", headers=hb).status_code == 204
    assert client.get(f"{API}/unread-count", headers=hb).json()["count"] == 0
    assert client.get(f"{API}/conversations/{cid}", headers=ha).json()["other_last_read_id"] == m2["id"]

    # reply, then the thread moves up for amy
    client.post(f"{API}/conversations", headers=ha, json={"username": "dm_cat"})
    m3 = client.post(f"{API}/conversations/{cid}/messages", headers=hb, json={"content": "그냥 쉬는 중"}).json()
    assert client.get(f"{API}/conversations/{cid}/messages", headers=ha, params={"after_id": m2["id"]}).json()[0]["id"] == m3["id"]
    assert [c["id"] for c in client.get(f"{API}/conversations", headers=ha).json()] == [cid]

    # unsend: only your own
    assert client.delete(f"{API}/messages/{m3['id']}", headers=ha).status_code == 404
    assert client.delete(f"{API}/messages/{m3['id']}", headers=hb).status_code == 204
    inbox = client.get(f"{API}/conversations", headers=ha).json()
    assert inbox[0]["last_message"]["id"] == m2["id"] and inbox[0]["unread_count"] == 0

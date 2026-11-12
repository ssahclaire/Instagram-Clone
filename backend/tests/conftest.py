import io
import os
import shutil
import tempfile

import pytest

_tmp = tempfile.mkdtemp(prefix="igclone-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db".replace("\\", "/")
os.environ["UPLOAD_DIR"] = os.path.join(_tmp, "static", "uploads")

from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c
    shutil.rmtree(_tmp, ignore_errors=True)


def make_image(color=(200, 50, 80), size=(400, 300)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, "PNG")
    return buf.getvalue()


def register(client, username, private=False):
    r = client.post("/api/v1/auth/register", json={
        "email": f"{username}@example.com", "full_name": username.title(),
        "username": username, "password": "password123",
    })
    assert r.status_code == 201, r.text
    token = r.json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}
    if private:
        assert client.put("/api/v1/users/me/profile", json={"is_private": True}, headers=h).status_code == 200
    return h

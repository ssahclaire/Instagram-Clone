"""Image upload handling: validate with Pillow, normalise to JPEG, store under static/uploads/<kind>/."""
import io
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings

# kind -> (max edge px, square crop)
_KINDS = {
    "profiles": (320, True),
    "posts": (1440, False),
    "stories": (1920, False),
}


async def save_image(upload: UploadFile, kind: str) -> str:
    max_edge, square = _KINDS[kind]
    data = await upload.read()
    if len(data) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"이미지는 {settings.MAX_UPLOAD_BYTES // (1024 * 1024)}MB 이하만 업로드할 수 있습니다.")
    try:
        img = Image.open(io.BytesIO(data))
        img = ImageOps.exif_transpose(img)
    except (UnidentifiedImageError, OSError):
        raise HTTPException(400, f"'{upload.filename}'은(는) 지원하지 않는 이미지 형식입니다.")

    if img.mode not in ("RGB", "L"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        rgba = img.convert("RGBA")
        bg.paste(rgba, mask=rgba.split()[-1])
        img = bg
    img = img.convert("RGB")

    if square:
        img = ImageOps.fit(img, (max_edge, max_edge), Image.Resampling.LANCZOS)
    else:
        img.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)

    folder = settings.upload_path / kind
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}.jpg"
    img.save(folder / name, "JPEG", quality=88, optimize=True)
    return f"/static/uploads/{kind}/{name}"


def delete_image(url: str | None) -> None:
    """Remove a previously stored upload. Ignores URLs outside our upload dir."""
    if not url or not url.startswith("/static/uploads/"):
        return
    rel = url[len("/static/uploads/"):]
    path = (settings.upload_path / rel).resolve()
    if settings.upload_path in path.parents and path.is_file():
        try:
            path.unlink()
        except OSError:
            pass


def ensure_upload_dirs() -> None:
    for kind in _KINDS:
        (settings.upload_path / kind).mkdir(parents=True, exist_ok=True)


def is_within_uploads(p: Path) -> bool:
    return settings.upload_path in p.resolve().parents

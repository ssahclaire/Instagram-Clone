import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import app.models  # noqa: F401  (register tables)
from app.api.v1.router import api_router
from app.api.v1.stories import purge_expired_stories
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.migrations import run_migrations
from app.services.files import ensure_upload_dirs

log = logging.getLogger("uvicorn.error")


def _purge_stories() -> int:
    with SessionLocal() as db:
        return purge_expired_stories(db)


async def _purge_stories_periodically() -> None:
    """The server runs for days in production, so expired stories are cleaned up on a timer too."""
    while True:
        await asyncio.sleep(settings.STORY_PURGE_INTERVAL_MINUTES * 60)
        try:
            await run_in_threadpool(_purge_stories)
        except Exception:  # keep the loop alive; try again next round
            log.exception("expired story cleanup failed")


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    for change in run_migrations(engine):
        log.info("schema migration: %s", change)
    _purge_stories()
    task = asyncio.create_task(_purge_stories_periodically())
    yield
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task


ensure_upload_dirs()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DOCS_ENABLED else None,
    redoc_url="/redoc" if settings.DOCS_ENABLED else None,
    openapi_url="/openapi.json" if settings.DOCS_ENABLED else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.mount("/static", StaticFiles(directory=settings.static_root), name="static")


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}

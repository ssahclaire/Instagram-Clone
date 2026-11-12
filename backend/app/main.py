from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import app.models  # noqa: F401  (register tables)
from app.api.v1.router import api_router
from app.api.v1.stories import purge_expired_stories
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.services.files import ensure_upload_dirs


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        purge_expired_stories(db)
    yield


ensure_upload_dirs()

app = FastAPI(title=settings.PROJECT_NAME, version="1.0.0", lifespan=lifespan)

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

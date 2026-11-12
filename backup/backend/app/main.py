import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import Base, engine
from app.api.v1.router import api_router
import app.models  # noqa: F401 - 모델 메타데이터 등록

# 업로드 폴더 생성
for folder in ["profiles", "posts", "stories"]:
    os.makedirs(os.path.join(settings.UPLOAD_DIR, folder), exist_ok=True)

# SQLite 테이블 자동 생성
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Instagram Clone FastAPI + SQLAlchemy + SQLite Backend",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["system"])
def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}

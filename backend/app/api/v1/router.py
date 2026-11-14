from fastapi import APIRouter

from app.api.v1 import auth, direct, notifications, posts, search, stories, users

api_router = APIRouter(prefix="/api/v1")
for module in (auth, users, posts, stories, notifications, search, direct):
    api_router.include_router(module.router)

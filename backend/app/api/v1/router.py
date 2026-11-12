from fastapi import APIRouter

from app.api.v1 import auth, notifications, posts, search, stories, users

api_router = APIRouter(prefix="/api/v1")
for module in (auth, users, posts, stories, notifications, search):
    api_router.include_router(module.router)

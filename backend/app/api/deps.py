from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import User

# Swagger "Authorize": paste the access_token returned by POST /auth/login.
# auto_error=False so a missing token is our 401 (not FastAPI's 403).
bearer_scheme = HTTPBearer(auto_error=False, description="POST /api/v1/auth/login 응답의 access_token")

DB = Annotated[Session, Depends(get_db)]
Credentials = Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)]


def _user_from(db: Session, creds: HTTPAuthorizationCredentials | None) -> User | None:
    if creds is None:
        return None
    user_id = decode_access_token(creds.credentials)
    return db.get(User, user_id) if user_id is not None else None


def get_current_user(db: DB, creds: Credentials) -> User:
    user = _user_from(db, creds)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 정보가 유효하지 않습니다. 다시 로그인해 주세요.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


# 비로그인(게스트) 열람을 허용하는 읽기 전용 엔드포인트용: 토큰이 없거나 유효하지 않으면 None
def get_optional_user(db: DB, creds: Credentials) -> User | None:
    return _user_from(db, creds)


OptionalUser = Annotated[User | None, Depends(get_optional_user)]

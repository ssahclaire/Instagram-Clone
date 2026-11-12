from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, or_, select

from app.api.deps import DB, CurrentUser
from app.core.security import create_access_token, hash_password, verify_password
from app.models import User
from app.schemas.user import LoginIn, RegisterIn, Token, UserMe

router = APIRouter(prefix="/auth", tags=["auth"])

BAD_LOGIN = "아이디 또는 비밀번호가 일치하지 않습니다."


def _token_for(user: User) -> Token:
    return Token(access_token=create_access_token(user.id), user=UserMe.model_validate(user))


def _authenticate(db: DB, identifier: str, password: str) -> User:
    ident = identifier.strip().lower()
    user = db.scalar(select(User).where(or_(User.username == ident, func.lower(User.email) == ident)))
    if not user or not user.is_active or not verify_password(password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, BAD_LOGIN)
    return user


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, db: DB):
    email = body.email.lower()
    if db.scalar(select(User.id).where(func.lower(User.email) == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "이미 사용 중인 이메일입니다.")
    if db.scalar(select(User.id).where(User.username == body.username)):
        raise HTTPException(status.HTTP_409_CONFLICT, "이미 사용 중인 사용자 이름입니다.")
    user = User(
        email=email, username=body.username, full_name=body.full_name.strip(),
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _token_for(user)


@router.post("/login", response_model=Token)
def login(body: LoginIn, db: DB):
    return _token_for(_authenticate(db, body.username, body.password))


@router.post("/token", response_model=Token, include_in_schema=True,
             summary="OAuth2 form login (Swagger 'Authorize' 버튼용)")
def token(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: DB):
    return _token_for(_authenticate(db, form.username, form.password))


@router.get("/me", response_model=UserMe)
def me(user: CurrentUser):
    return user

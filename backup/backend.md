# 백엔드 개발 요청 명세서 (backend.md)

## 1. 개요
- **프레임워크**: FastAPI (Python 3.10+)
- **ORM & DB**: SQLAlchemy 2.0 + SQLite (`instagram.db`)
- **인증 방식**: OAuth2 Password Bearer + JWT (`HS256`) + Bcrypt 비밀번호 해싱
- **정적 파일 서빙**: `/static/uploads` (`profiles/`, `posts/`, `stories/`)

---

## 2. 백엔드 디렉터리 구조

```text
backend/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py
│   ├── models/
│   │   ├── user.py
│   │   └── post.py
│   ├── schemas/
│   │   ├── user.py
│   │   └── post.py
│   └── api/
│       ├── deps.py
│       └── v1/
│           ├── router.py
│           ├── auth.py
│           ├── users.py
│           └── posts.py
├── static/uploads/
├── requirements.txt
└── .env
```

---

## 3. 주요 REST API 엔드포인트 (`/api/v1`)
- **Auth (`/api/v1/auth`)**: `POST /register`, `POST /login`, `GET /me`
- **Users (`/api/v1/users`)**: `GET /{username}`, `PUT /me/profile`, `POST /me/avatar`, `DELETE /me/avatar`, `POST /{username}/follow`, `GET /{username}/followers`, `GET /{username}/following`, `GET /search`
- **Posts (`/api/v1/posts`)**: `GET /feed`, `GET /explore`, `POST /`, `GET /{post_id}`, `DELETE /{post_id}`, `POST /{post_id}/like`, `POST /{post_id}/bookmark`, `POST /{post_id}/comments`, `DELETE /comments/{comment_id}`

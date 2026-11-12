# 백엔드 개발 명세서 (backend.md)

## 1. 개요
| 항목 | 내용 |
| :--- | :--- |
| 프레임워크 | FastAPI (Python 3.10+, 개발 환경 3.11) |
| ORM / DB | SQLAlchemy 2.0 + SQLite (`instagram.db`) — 상세는 [db.md](db.md) |
| 인증 | OAuth2 Password Bearer + JWT (`HS256`, PyJWT) + bcrypt 해싱 |
| 이미지 처리 | Pillow (검증 · EXIF 회전 보정 · 리사이즈 · JPEG 변환) |
| 정적 파일 | `/static/uploads/{profiles,posts,stories}/` |
| API 문서 | Swagger `http://localhost:8000/docs`, ReDoc `/redoc` |
| 테스트 | pytest + FastAPI TestClient (`backend/tests/`) |

---

## 2. 디렉터리 구조

```text
backend/
├── app/
│   ├── main.py                 # 앱 생성, CORS, 라우터·StaticFiles 마운트, 시작 시 테이블 생성/만료 스토리 정리
│   ├── core/
│   │   ├── config.py           # pydantic-settings (.env), 상대 경로를 backend/ 기준으로 해석
│   │   ├── database.py         # 엔진, PRAGMA, SessionLocal, get_db
│   │   └── security.py         # bcrypt 해시/검증, JWT 발급/디코드
│   ├── models/                 # user.py(User, Follow) · post.py(Post, PostImage, PostLike, Bookmark, Comment, Hashtag, PostHashtag) · social.py(Story, Notification)
│   ├── schemas/                # Pydantic 요청/응답 모델 (user.py, post.py, social.py, common.py)
│   ├── services/
│   │   ├── files.py            # 이미지 저장/삭제
│   │   └── social.py           # 가시성 규칙, 해시태그 동기화, 알림 생성, 게시물 직렬화
│   └── api/
│       ├── deps.py             # DB 세션, get_current_user (CurrentUser)
│       └── v1/                 # router.py, auth.py, users.py, posts.py, stories.py, notifications.py, search.py
├── tests/                      # conftest.py, test_api.py (임시 DB로 전체 플로우 테스트)
├── static/uploads/
├── seed.py                     # 데모 데이터 생성 (python seed.py [--reset])
├── requirements.txt
├── .env.example
└── .env
```

---

## 3. 공통 규약
- **Base URL**: `/api/v1`
- **인증 헤더**: `Authorization: Bearer <access_token>` — `/auth/register`, `/auth/login`, `/auth/token` 외 모든 엔드포인트에 필요
- **에러 형식**: `{"detail": "한국어 메시지"}` (검증 오류는 FastAPI 기본 `422` 배열 형식)
- **주요 상태 코드**: `401` 토큰 없음/만료/로그인 실패 · `403` 권한 없음(타인 게시물 수정, 비공개 계정 목록) · `404` 없음 또는 볼 수 없는 게시물 · `409` 아이디/이메일 중복 · `413` 파일 크기 초과(10MB)
- **페이지네이션**: `?skip=0&limit=N` (offset 방식)
- **시간**: ISO-8601 UTC (`2026-11-12T03:21:00Z`)

---

## 4. REST API 명세

### 4.1 Auth (`/api/v1/auth`)
| 메서드 | 경로 | 요청 | 응답 | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/register` | `{email, full_name, username, password}` | `201 Token` | 중복 시 `409`. 가입 즉시 토큰 발급 |
| POST | `/login` | `{username, password}` | `Token` | `username` 자리에 이메일도 가능. 실패 시 `401 "아이디 또는 비밀번호가 일치하지 않습니다."` |
| POST | `/token` | form `username, password` | `Token` | Swagger **Authorize** 버튼용 OAuth2 폼 로그인 |
| GET | `/me` | — | `UserMe` | 현재 로그인 사용자 |

`Token = {access_token, token_type: "bearer", user: UserMe}`

### 4.2 Users (`/api/v1/users`)
| 메서드 | 경로 | 설명 |
| :--- | :--- | :--- |
| GET | `/search?q=` | 사용자 이름·성명 부분 검색 |
| GET | `/suggestions?limit=5` | 아직 팔로우하지 않은 사용자 추천 (팔로워 수 순) |
| PUT | `/me/profile` | `{full_name?, username?, bio?(≤150), website?, is_private?}` → `UserMe` |
| PUT | `/me/password` | `{current_password, new_password(≥8)}` → `204` |
| POST | `/me/avatar` | multipart `file` → `UserMe` (기존 파일 삭제) |
| DELETE | `/me/avatar` | 기본 아바타로 초기화 → `UserMe` |
| GET | `/me/saved` | 저장한 게시물 (`PostOut[]`) |
| GET | `/me/follow-requests` | 받은 팔로우 요청 목록 |
| POST | `/me/follow-requests/{username}/accept` | 요청 수락 → `204` |
| DELETE | `/me/follow-requests/{username}` | 요청 거절 → `204` |
| DELETE | `/me/followers/{username}` | 내 팔로워에서 삭제 → `204` |
| GET | `/{username}` | `Profile` (게시물/팔로워/팔로잉 수, `follow_status`, `follows_you`, `is_me`, `can_view_posts`) |
| GET | `/{username}/posts` | 사용자 게시물 (비공개·미승인 시 `403`) |
| POST | `/{username}/follow` | **토글**: 팔로우(비공개면 요청) ↔ 언팔로우/요청 취소 → `{follow_status, follower_count}` |
| GET | `/{username}/followers` · `/following` | `UserListItem[]` (각 항목에 내 `follow_status`, `is_me`) |

### 4.3 Posts (`/api/v1/posts`)
| 메서드 | 경로 | 설명 |
| :--- | :--- | :--- |
| GET | `/feed?skip&limit=10` | 내 게시물 + 팔로우(accepted) 중인 계정의 게시물, 최신순 |
| GET | `/explore?skip&limit=30` | 볼 수 있는 타인 게시물, 좋아요 많은 순 → 최신순 |
| GET | `/tags/{name}` | 해시태그 게시물 |
| POST | `` (=`/api/v1/posts`) | multipart: `files`(1~10장), `caption`(≤2200), `location`(≤100) → `201 PostOut` |
| GET | `/{post_id}` | `PostOut` |
| PUT | `/{post_id}` | `{caption?, location?}` 본인만 (해시태그 재동기화) |
| DELETE | `/{post_id}` | 본인만, 이미지 파일까지 삭제 → `204` |
| POST | `/{post_id}/like` | 토글 → `{liked, like_count}` |
| GET | `/{post_id}/likes` | 좋아요 누른 사용자 목록 |
| POST | `/{post_id}/bookmark` | 토글 → `{bookmarked}` |
| GET | `/{post_id}/comments` | 평면 목록(오래된 순). 클라이언트가 `parent_id`로 트리 구성 |
| POST | `/{post_id}/comments` | `{content, parent_id?}` → `201 CommentOut` |
| DELETE | `/comments/{comment_id}` | 댓글 작성자 또는 게시물 작성자 → `204` (답글 CASCADE) |

`PostOut = {id, author: UserPublic, caption, location, images:[{id,image_url,display_order}], like_count, comment_count, is_liked, is_bookmarked, created_at, updated_at}`

### 4.4 Stories (`/api/v1/stories`)
| 메서드 | 경로 | 설명 |
| :--- | :--- | :--- |
| GET | `/feed` | 나 + 팔로잉의 미만료 스토리를 사용자별 그룹으로 (`[{user, stories:[...]}]`, 내 것이 먼저) |
| POST | `` | multipart `file` → `201` (24시간 후 만료) |
| DELETE | `/{story_id}` | 본인만 |

### 4.5 Notifications (`/api/v1/notifications`)
| 메서드 | 경로 | 설명 |
| :--- | :--- | :--- |
| GET | `` | 최근 알림 50개 (actor 정보 + 내 팔로우 상태, 게시물 썸네일, 댓글 내용 포함) |
| GET | `/unread-count` | `{count}` — 프론트엔드가 30초마다 폴링 |
| POST | `/read-all` | 모두 읽음 처리 → `204` |

### 4.6 Search (`/api/v1/search`)
| 메서드 | 경로 | 설명 |
| :--- | :--- | :--- |
| GET | `?q=` | `{users, hashtags:[{name, post_count}]}`. `#`로 시작하면 해시태그만 검색 |

---

## 5. 보안 및 검증
- 비밀번호: bcrypt (salt 자동), 평문 저장/로그 금지
- JWT: `sub=user_id`, `exp` 기본 1440분. `SECRET_KEY`는 `.env`에서 주입 (32바이트 이상 랜덤 문자열)
- 업로드: Pillow로 실제 이미지인지 검증 → 실패 시 `400`, 10MB 초과 `413`, 모든 이미지를 JPEG로 재인코딩 (EXIF 메타데이터 제거 효과)
- 파일 삭제는 업로드 폴더 내부 경로만 허용 (경로 탈출 방지)
- CORS: `CORS_ORIGINS` 화이트리스트 (기본 `localhost:5173`)

---

## 6. 테스트
```powershell
cd backend
.\venv\Scripts\python.exe -m pytest -q
```
임시 DB/업로드 폴더를 사용하며 다음을 검증합니다: 회원가입·중복(409)·로그인(아이디/이메일), 프로필 수정·아바타 업로드/삭제·비밀번호 변경, 게시물 생성(다중 이미지)·피드·탐색·좋아요·북마크·댓글/답글·알림·해시태그·검색·수정·삭제 권한, 비공개 계정 요청/수락, 스토리.

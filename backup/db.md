# 데이터베이스 설계 명세서 (db.md)

## 1. 개요
- **DBMS**: SQLite 3 (`instagram.db`)
- **ORM**: SQLAlchemy 2.0
- **필수 PRAGMA 설정**:
  - `PRAGMA foreign_keys = ON;` (외래키 제약조건 및 CASCADE 활성화)
  - `PRAGMA journal_mode = WAL;` (동시 읽기/쓰기 성능 향상)

---

## 2. 핵심 테이블 스키마 (10개 테이블)

1. **`users`**: 사용자 계정 및 프로필 (`id`, `username`, `email`, `hashed_password`, `full_name`, `bio`, `website`, `profile_image_url`, `is_private`, `is_active`, `created_at`, `updated_at`)
2. **`follows`**: 팔로우/팔로잉 관계 (`follower_id`, `following_id`, `status`, `created_at`)
3. **`posts`**: 게시물 본문 및 위치 (`id`, `user_id`, `caption`, `location`, `created_at`, `updated_at`)
4. **`post_images`**: 다중 이미지 슬라이드 (`id`, `post_id`, `image_url`, `display_order`)
5. **`post_likes`**: 게시물 좋아요 (`user_id`, `post_id`, `created_at`)
6. **`bookmarks`**: 게시물 저장/북마크 (`user_id`, `post_id`, `created_at`)
7. **`comments`**: 댓글 및 대댓글 (`id`, `post_id`, `user_id`, `parent_id`, `content`, `created_at`)
8. **`hashtags`**: 해시태그 사전 (`id`, `name`, `created_at`)
9. **`post_hashtags`**: 게시물-해시태그 다대다 매핑 (`post_id`, `hashtag_id`)
10. **`stories` & `notifications`**: 24시간 스토리 및 사용자 알림 테이블

# 프론트엔드 개발 명세서 (front.md)

## 1. 개요
| 항목 | 내용 |
| :--- | :--- |
| 프레임워크 / 빌드 | React 18 + Vite 5 (JavaScript ES2022, JSX) |
| 스타일링 | Tailwind CSS 3 (Instagram 라이트 테마, 반응형) |
| 라우팅 | React Router v6 (`react-router-dom`) |
| 전역 상태 | React Context — `AuthContext`(로그인 유저), `UIContext`(게시물 상세/만들기 모달), `ToastProvider` |
| 서버 상태 | 커스텀 훅 `useInfinitePosts` (무한 스크롤) + 경량 pub/sub `postStore` (같은 게시물을 여러 화면에서 동기화) |
| HTTP | Axios (인터셉터로 JWT 자동 첨부, `401` 시 토큰 삭제 후 `/login`) |
| 아이콘 | `lucide-react` |

---

## 2. 디렉터리 구조

```text
frontend/
├── public/
│   ├── default-avatar.svg          # 기본 프로필 이미지
│   └── favicon.svg
├── src/
│   ├── api/
│   │   ├── client.js               # Axios 인스턴스, JWT 인터셉터, errorMessage() 헬퍼
│   │   ├── authApi.js              # 로그인, 회원가입, 내 정보
│   │   ├── userApi.js              # 프로필/아바타/비밀번호, 팔로우·요청, 추천, 검색
│   │   └── postApi.js              # postApi(피드·게시물·좋아요·북마크·댓글), storyApi, notificationApi
│   ├── context/
│   │   ├── AuthContext.jsx         # 토큰 보관, user/loading, login/register/logout/updateUser
│   │   └── UIContext.jsx           # openPost(id)/closePost, openCreate/closeCreate
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx       # 사이드바·모바일 탭바·드로어·전역 모달, 알림 수 30초 폴링
│   │   │   ├── Sidebar.jsx         # Sidebar(데스크톱/태블릿) + MobileNav(모바일 헤더/하단 탭바)
│   │   │   └── ProtectedRoute.jsx  # ProtectedRoute(인증 필수) / GuestRoute(비인증 전용)
│   │   ├── auth/                   # AuthCard(카드 레이아웃·FloatingInput), LoginForm, RegisterForm
│   │   ├── profile/
│   │   │   ├── ProfileHeader.jsx   # 아바타, 통계, 이름/소개/웹사이트, 팔로우 or 프로필 편집
│   │   │   ├── AvatarUploadModal.jsx
│   │   │   ├── FollowListModal.jsx # UserListModal(범용) + 팔로워/팔로잉 모달
│   │   │   └── ProfilePostGrid.jsx # 3열 정방형 그리드 (호버 시 ❤️/💬 수)
│   │   ├── post/
│   │   │   ├── PostCard.jsx        # 피드 카드
│   │   │   ├── PostActions.jsx     # 좋아요·댓글·공유·북마크 + 좋아요 수(클릭 시 좋아요 목록)
│   │   │   ├── ImageCarousel.jsx   # 다중 이미지 슬라이드, 점 인디케이터, 스와이프, 더블클릭 하트
│   │   │   ├── PostOptions.jsx     # ⋯ 메뉴 (수정/삭제/게시물로 이동/링크 복사) + 수정 모달
│   │   │   ├── PostDetail.jsx      # 좌 이미지 / 우 댓글·답글 패널 (모달·페이지 공용)
│   │   │   ├── PostDetailModal.jsx
│   │   │   └── CreatePostModal.jsx # 드래그앤드롭, 최대 10장, 미리보기·개별 삭제, 캡션/위치, 업로드 진행률
│   │   ├── story/
│   │   │   ├── StoryBar.jsx        # 홈 상단 스토리 목록 + 내 스토리 추가
│   │   │   └── StoryViewer.jsx     # 전체화면 재생 (5초 자동 넘김, 진행 바, 일시정지, 삭제)
│   │   └── common/
│   │       ├── Avatar.jsx          # 스토리 링(unseen 그라데이션 / seen 회색) 옵션
│   │       ├── Modal.jsx           # Modal + ActionSheet
│   │       ├── SearchDrawer.jsx    # SearchPanel(실시간 검색, 최근 검색) + Drawer
│   │       ├── NotificationList.jsx# 알림 목록 (요청 수락/거절, 맞팔로우, 게시물 썸네일)
│   │       ├── FollowButton.jsx    # 팔로우 / 팔로잉 / 요청됨
│   │       ├── UserRow.jsx
│   │       ├── Spinner.jsx         # Spinner, PostSkeleton, GridSkeleton
│   │       └── Toast.jsx           # ToastProvider + useToast()
│   ├── pages/
│   │   ├── LoginPage.jsx           # /login
│   │   ├── RegisterPage.jsx        # /register
│   │   ├── HomePage.jsx            # / — 스토리 + 피드 + 우측 추천
│   │   ├── ProfilePage.jsx         # /:username, /:username/saved
│   │   ├── EditProfilePage.jsx     # /accounts/edit — 프로필 편집 / 비밀번호 변경
│   │   ├── ExplorePage.jsx         # /explore (모바일은 상단 검색창 포함)
│   │   ├── TagPage.jsx             # /explore/tags/:tag
│   │   ├── PostPage.jsx            # /p/:postId (공유 링크용 단독 페이지)
│   │   └── NotificationsPage.jsx   # /notifications (모바일)
│   ├── utils/
│   │   ├── formatTime.js           # 방금 전 / N분 전 / N시간 전 / N일 전 / N주 전 / 날짜, formatCount
│   │   ├── RichText.jsx            # #해시태그·@멘션 링크 렌더링
│   │   ├── postStore.js            # emitPost / useSyncedPosts / useSyncedPost / 낙관적 toggleLike·toggleBookmark·addComment
│   │   └── useInfinitePosts.js     # skip/limit 페이지네이션 + IntersectionObserver
│   ├── App.jsx                     # 라우트 정의
│   ├── main.jsx                    # Provider 구성
│   └── index.css                   # Tailwind 지시어, 버튼/입력 컴포넌트 클래스, 스토리 링, 스크롤바
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js                  # /api, /static → http://127.0.0.1:8000 프록시
```

---

## 3. 라우팅

| 경로 | 페이지 | 권한 | 설명 |
| :--- | :--- | :---: | :--- |
| `/login` | `LoginPage` | 비인증 전용 | 로그인 상태면 `/`로 이동 |
| `/register` | `RegisterPage` | 비인증 전용 | |
| `/` | `HomePage` | 인증 | 스토리 바, 무한 스크롤 피드, 우측 추천(≥1280px) |
| `/explore` | `ExplorePage` | 인증 | 탐색 그리드 |
| `/explore/tags/:tag` | `TagPage` | 인증 | 해시태그 게시물 |
| `/accounts/edit` | `EditProfilePage` | 인증 | |
| `/notifications` | `NotificationsPage` | 인증 | 모바일 알림 화면 |
| `/p/:postId` | `PostPage` | 인증 | 게시물 단독 페이지 |
| `/:username` | `ProfilePage` | 인증 | 게시물 탭 |
| `/:username/saved` | `ProfilePage` | 인증 | 저장됨 탭 (본인만, 타인은 게시물 탭으로 표시) |
| `*` | → `/` | | |

인증 페이지 접근 시 비로그인이면 `/login`으로 이동하며, 로그인 후 원래 경로로 복귀합니다(`location.state.from`).

---

## 4. 화면별 기능 명세

### 4.1 회원가입 / 로그인
- **로그인**: `사용자 이름 또는 이메일`, `비밀번호`(보기/숨기기 토글). 모든 필드 입력 전 버튼 비활성. 성공 시 `localStorage.access_token` 저장 → `AuthContext` 갱신 → 이동. 실패 시 폼 하단 빨간 텍스트(서버 메시지).
- **회원가입**: 이메일·성명·사용자 이름·비밀번호. 실시간 검증(이메일 정규식, 사용자 이름 `^[a-z0-9._]{1,30}$` — 대문자는 자동 소문자화, 비밀번호 8자 이상) + 입력창 우측 ✓/✕ 아이콘. 서버 `409` 메시지 표시. 가입 즉시 자동 로그인 후 `/`.
- **Axios 인터셉터**: 요청마다 `Authorization: Bearer` 첨부. `401` 응답(로그인/가입 요청 제외) 시 토큰 삭제 → `/login`.
- 새로고침 시 토큰이 있으면 `GET /auth/me`로 세션 복원 (복원 중 전체 화면 스피너).

### 4.2 프로필 (`/:username`)
- 헤더: 아바타(데스크톱 150px / 모바일 77px, 본인이면 클릭 시 `AvatarUploadModal`), username, `[프로필 편집]` 또는 `[팔로우]/[팔로잉]/[요청됨]`, `게시물 N · 팔로워 N · 팔로우 N`(클릭 시 목록 모달), 성명·소개(`whitespace-pre-line`)·웹사이트(새 탭), "회원님을 팔로우합니다" 표시.
- 탭: `게시물` / `저장됨`(본인만). 3열 정방형 그리드, 다중 이미지 아이콘, 호버 오버레이(`bg-black/40`)로 좋아요·댓글 수, 클릭 시 `PostDetailModal`.
- 비공개 계정 & 미승인: 자물쇠 안내 화면, 팔로워/팔로잉 목록 비활성.
- 내 팔로워 목록에는 `[삭제]` 버튼(팔로워 제거).

### 4.3 프로필 편집 (`/accounts/edit`)
- 사진 변경(업로드 / 현재 사진 삭제 / 취소) → 사이드바·헤더 아바타 즉시 반영
- 이름, 사용자 이름(형식 검증·중복 `409` 표시), 웹사이트, 소개(`0 / 150` 카운터), 비공개 계정 토글
- 변경 사항이 있을 때만 `[제출]` 활성 → `PUT /users/me/profile` → 토스트 "프로필이 저장되었습니다." + `AuthContext` 동기화
- 비밀번호 변경 탭: 이전/새/확인, 8자 이상·일치 검증

### 4.4 홈 피드 (`/`)
- **스토리 바**: 내 스토리(+ 버튼으로 업로드) + 팔로잉 스토리. 본 스토리는 회색 링(localStorage 기록).
- **피드 카드**: 헤더(아바타, username, 상대 시간, 위치, ⋯ 메뉴) → 캐러셀(더블클릭 큰 하트 + 좋아요) → 액션 바(❤️ 💬 ✈️ … 🔖) → `좋아요 N개` → 캡션(2줄/120자 초과 시 `... 더 보기`, `#해시태그`/`@멘션` 링크) → `댓글 N개 모두 보기` → 한 줄 댓글 입력(Enter/게시).
- 10개 단위 무한 스크롤, 첫 로딩은 스켈레톤, 끝에 "모두 확인했습니다".
- 팔로우가 없으면 환영 메시지 + 추천 계정 + 탐색 탭 링크.

### 4.5 게시물 상세 (`PostDetailModal`, `/p/:id`)
- 데스크톱: 좌측 이미지(검정 배경, contain) / 우측 405px 패널. 모바일: 세로 스택 전체 화면.
- 캡션을 첫 댓글처럼 표시, 댓글 + 답글(접기/펼치기 "답글 보기(N개)"), `답글 달기` 시 `@username` 자동 입력, 본인 댓글 또는 내 게시물의 댓글은 호버 시 `삭제`.
- 좋아요/북마크/댓글은 낙관적 업데이트 후 `postStore`로 피드 카드·그리드에 즉시 반영.

### 4.6 새 게시물 만들기 (`CreatePostModal`)
- Step 1: 드래그 앤 드롭 또는 `컴퓨터에서 선택` (이미지만, 최대 10장)
- Step 2: 미리보기(좌우 이동, 썸네일 스트립, 사진 추가, 현재 사진 삭제) + 캡션(2,200자 카운터) + 위치 → `[공유하기]` 시 `multipart/form-data` 업로드, 진행률 표시
- 작성 중 닫기/뒤로 시 "게시물을 삭제하시겠어요?" 확인
- 성공 시 홈 피드와 내 프로필 그리드 맨 앞에 즉시 추가

### 4.7 검색 / 탐색 / 알림
- **검색 드로어**(데스크톱·태블릿): 250ms 디바운스 실시간 검색, 사용자 + 해시태그, 최근 검색(localStorage, 모두 지우기). 모바일은 `/explore` 상단 검색창.
- **탐색**: 좋아요 순 3열 그리드, 무한 스크롤. **해시태그 페이지**: `#tag`, 게시물 수, 그리드.
- **알림**: 오늘/이번 주/이번 달/이전 활동 그룹, 좋아요·댓글·답글·팔로우·팔로우 요청(확인/삭제), 팔로우 알림엔 맞팔로우 버튼, 게시물 썸네일 클릭 시 상세 모달. 열람 시 모두 읽음 처리. 사이드바 하트에 안 읽은 수 배지(30초 폴링).

---

## 5. 디자인 시스템 및 반응형

| 구분 | 값 | 비고 |
| :--- | :--- | :--- |
| 배경 | `#FFFFFF`, 보조 `#FAFAFA` (`ig-bg`) | |
| 테두리 | `#DBDBDB` (`ig-border`) | |
| 포인트 | `#0095F6` (`ig-blue`), hover `#1877F2` | 주요 버튼, 링크 |
| 해시태그/링크 | `#00376B` (`ig-link`) | |
| 좋아요 | `#FF3040` (`ig-red`) | |
| 보조 텍스트 | `#737373` (`ig-secondary`) | |
| 로고 폰트 | Grand Hotel (Google Fonts) | |
| 데스크톱 `≥1024px` | 좌측 고정 사이드바 244px + 중앙(피드 630px / 프로필 935px) + 우측 추천 320px(≥1280px) | 검색·알림 드로어 열면 사이드바 72px로 축소 |
| 태블릿 `768~1023px` | 아이콘 전용 사이드바 72px + 중앙 | 추천 패널 숨김 |
| 모바일 `<768px` | 상단 헤더 44px(홈) + 전체 폭 콘텐츠 + 하단 탭바 48px | 홈·탐색·만들기·알림·프로필 |

애니메이션: 더블클릭 하트 팝(`heartPop`), 좋아요 버튼 바운스(`likeBounce`), 모달 페이드인, 토스트 슬라이드업, 스토리 진행 바.

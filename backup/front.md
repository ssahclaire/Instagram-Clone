# 프론트엔드 개발 명세서 (front.md)

## 1. 개요
본 문서는 **Instagram 클론 웹 애플리케이션**의 React 기반 프론트엔드 개발 명세서입니다.
- **프레임워크 & 빌드 도구**: React 18 + Vite (TypeScript 또는 JavaScript ES6+)
- **스타일링**: Tailwind CSS (Instagram 웹 다크/라이트 테마 및 반응형 레이아웃 구현)
- **라우팅**: React Router v6 (`react-router-dom`)
- **상태 관리 & 데이터 패칭**:
  - 서버 상태: TanStack Query (React Query) 또는 커스텀 Fetch/Axios 훅
  - 클라이언트 전역 상태(인증 유저 정보, 모달 상태): Zustand 또는 React Context API (`AuthContext`)
- **HTTP 클라이언트**: Axios (Interceptors를 활용한 JWT 자동 주입 및 `401` 만료 처리)
- **아이콘**: `lucide-react`

---

## 2. 프론트엔드 디렉터리 구조

```text
frontend/
├── public/
│   └── default-avatar.png          # 기본 프로필 이미지
├── src/
│   ├── api/
│   │   ├── client.js               # Axios 인스턴스 및 JWT 인터셉터 설정
│   │   ├── authApi.js              # 로그인, 회원가입, 내 정보 조회 API
│   │   ├── userApi.js              # 프로필 조회/수정, 프로필 사진 업로드, 팔로우 API
│   │   └── postApi.js              # 피드, 게시물 업로드/상세/삭제, 좋아요, 북마크, 댓글 API
│   ├── context/
│   │   └── AuthContext.jsx         # JWT 토큰 관리, 로그인 유저 상태, login/logout/updateUser 함수
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx       # 좌측 사이드바(데스크톱) / 하단 탭바(모바일) 레이아웃
│   │   │   ├── Sidebar.jsx         # 홈, 검색, 탐색, 만들기, 프로필 네비게이션
│   │   │   └── ProtectedRoute.jsx  # 비로그인 사용자 접근 차단 및 /login 리다이렉트
│   │   ├── auth/
│   │   │   ├── LoginForm.jsx       # 로그인 폼 컴포넌트
│   │   │   └── RegisterForm.jsx    # 회원가입 폼 및 실시간 유효성 검사 컴포넌트
│   │   ├── profile/
│   │   │   ├── ProfileHeader.jsx   # 프로필 사진, 게시물/팔로워/팔로잉 수, 소개글(bio), 웹사이트, 팔로우/프로필 편집 버튼
│   │   │   ├── AvatarUploadModal.jsx # 프로필 사진 업로드 / 현재 사진 삭제 모달
│   │   │   ├── FollowListModal.jsx # 팔로워 / 팔로잉 목록 모달
│   │   │   └── ProfilePostGrid.jsx # 3열 정방형(1:1) 게시물 썸네일 그리드 (호버 시 좋아요/댓글 수 표시)
│   │   ├── post/
│   │   │   ├── PostCard.jsx        # 피드 단일 게시물 카드 (헤더, 캐러셀, 액션바, 좋아요 수, 캡션, 댓글 입력)
│   │   │   ├── ImageCarousel.jsx   # 다중 이미지 좌/우 슬라이드 및 인디케이터 점(Dot)
│   │   │   ├── CreatePostModal.jsx # 드래그앤드롭 다중 이미지 선택, 미리보기, 캡션/위치 입력 모달
│   │   │   └── PostDetailModal.jsx # 데스크톱 좌측 이미지 / 우측 댓글창 상세 모달
│   │   └── common/
│   │       ├── Avatar.jsx          # 사용자 아바타 공통 컴포넌트 (스토리 링 옵션 포함)
│   │       ├── SearchDrawer.jsx    # 사이드바 확장형 사용자/해시태그 실시간 검색 드로어
│   │       └── Toast.jsx           # 알림 토스트 메시지
│   ├── pages/
│   │   ├── LoginPage.jsx           # 로그인 페이지 (/login)
│   │   ├── RegisterPage.jsx        # 회원가입 페이지 (/register)
│   │   ├── HomePage.jsx            # 메인 피드 + 우측 추천 친구 사이드바 (/)
│   │   ├── ProfilePage.jsx         # 사용자 프로필 페이지 (/:username) - [게시물 / 저장됨] 탭 포함
│   │   ├── EditProfilePage.jsx     # 프로필 편집 및 비밀번호 변경 페이지 (/accounts/edit)
│   │   └── ExplorePage.jsx         # 탐색 탭 그리드 페이지 (/explore)
│   ├── utils/
│   │   └── formatTime.js           # 상대 시간 포맷터 (방금 전, 3분 전, 2시간 전, 3일 전)
│   ├── App.jsx                     # 라우트 정의
│   ├── main.jsx
│   └── index.css                   # Tailwind 지시어 및 커스텀 스크롤바 스타일
├── index.html
├── package.json
└── vite.config.js
```

---

## 3. 라우팅 설계 (Routing Table)

| 경로 (Path) | 페이지 컴포넌트 | 접근 권한 | 설명 |
| :--- | :--- | :---: | :--- |
| `/login` | `LoginPage` | 비인증 전용 | 로그인 화면 (이미 로그인된 경우 `/`로 이동) |
| `/register` | `RegisterPage` | 비인증 전용 | 회원가입 화면 |
| `/` | `HomePage` | 인증 필수 | 메인 홈 피드 및 우측 계정 추천 영역 |
| `/:username` | `ProfilePage` | 인증 필수 (또는 공개) | 사용자 프로필 헤더 + 작성 게시물/북마크 3열 그리드 |
| `/accounts/edit` | `EditProfilePage` | 인증 필수 | 프로필 사진 변경, 이름, 사용자 이름, 소개글(Bio), 웹사이트 수정 |
| `/explore` | `ExplorePage` | 인증 필수 | 전체 공개 게시물 탐색 그리드 |

---

## 4. 핵심 화면별 UI/UX 및 기능 명세

### 4.1 회원가입 및 로그인 (JWT 인증)
1. **로그인 화면 (`/login`)**
   - Instagram 로고 및 깔끔한 카드형 레이아웃 제공
   - 입력창: `사용자 이름 또는 이메일`, `비밀번호` (비밀번호 보기/숨기기 토글 지원)
   - 모든 필드가 채워지기 전까지 **[로그인]** 버튼 비활성화 처리
   - 로그인 성공 시 `localStorage`에 `access_token`을 저장하고 `AuthContext` 상태를 갱신한 뒤 `/`로 이동
   - 에러 발생 시 폼 하단에 붉은색 텍스트로 서버 에러 메시지 표시 (`"아이디 또는 비밀번호가 일치하지 않습니다."`)

2. **회원가입 화면 (`/register`)**
   - 입력창: `이메일 주소`, `성명(Full Name)`, `사용자 이름(Username)`, `비밀번호`
   - 클라이언트 유효성 검증:
     - 이메일 형식 정규식 검사
     - 사용자 이름: 영문 소문자, 숫자, `_`, `.` 외 입력 시 즉시 안내 메시지 출력
     - 비밀번호: 8자 이상 여부 체크
   - 가입 완료 시 자동 로그인 처리 후 프로필 설정 또는 메인 피드(`/`)로 이동

3. **Axios JWT 인터셉터 (`src/api/client.js`)**
   - **Request Interceptor**: `localStorage.getItem('access_token')`이 존재하면 모든 요청 헤더에 `Authorization: Bearer ${token}` 자동 첨부
   - **Response Interceptor**: `401 Unauthorized` 응답 수신 시 토큰을 삭제하고 `/login` 페이지로 자동 리다이렉트

---

### 4.2 프로필 조회 및 프로필 관리 (`/:username`, `/accounts/edit`)
1. **프로필 페이지 (`ProfilePage.jsx`)**
   - **상단 헤더 (`ProfileHeader`)**:
     - 좌측: 원형 프로필 이미지 (`150px x 150px`, 모바일 `77px x 77px`). 본인 프로필일 경우 클릭 시 **프로필 사진 변경 모달(`AvatarUploadModal`)** 오픈
     - 우측 1행: `username` + 본인인 경우 **[프로필 편집]** 버튼 (`/accounts/edit` 이동), 타인인 경우 **[팔로우] / [팔로잉]** 토글 버튼
     - 우측 2행: `게시물 N` · `팔로워 N` (클릭 시 팔로워 모달) · `팔로잉 N` (클릭 시 팔로잉 모달)
     - 우측 3행: `full_name`(굵게), `bio`(줄바꿈 `whitespace-pre-line` 유지), `website`(외부 링크 아이콘 및 새 탭 열기)
   - **하단 콘텐츠 탭**:
     - `게시물 (POSTS)`: 해당 유저가 업로드한 게시물 3열 정방형 그리드
     - `저장됨 (SAVED)`: 본인 프로필일 때만 노출되며 북마크한 게시물 3열 그리드 표시
   - **그리드 아이템 인터랙션**:
     - 정방형(`aspect-square object-cover`) 썸네일 표시, 다중 이미지 게시물은 우측 상단에 레이어 아이콘 표시
     - 마우스 오버 시 반투명 오버레이(`bg-black/40`)와 함께 `❤️ 좋아요 수`, `💬 댓글 수` 중앙 표시
     - 클릭 시 `PostDetailModal` 오픈

2. **프로필 편집 페이지 (`EditProfilePage.jsx`)**
   - **프로필 사진 변경 영역**:
     - 현재 아바타 미리보기 + **[사진 변경]** 버튼 클릭 시 `AvatarUploadModal` 호출
     - `AvatarUploadModal` 옵션:
       1. **사진 업로드** (`input type="file" accept="image/*"`, 즉시 `POST /api/v1/users/me/avatar` 호출)
       2. **현재 사진 삭제** (`DELETE /api/v1/users/me/avatar` 호출 후 기본 아바타로 전환)
       3. **취소**
   - **프로필 정보 수정 폼**:
     - `이름 (full_name)`: 텍스트 입력
     - `사용자 이름 (username)`: 텍스트 입력 (중복 시 에러 표시)
     - `웹사이트 (website)`: URL 입력 (`https://...`)
     - `소개 (bio)`: `textarea` 입력 및 실시간 글자 수 카운터 (`0 / 150`) 표시
     - `비공개 계정 (is_private)`: 토글 스위치
   - **[제출]** 버튼 클릭 시 `PUT /api/v1/users/me/profile` 호출, 성공 시 토스트 알림(`"프로필이 저장되었습니다."`) 출력 및 `AuthContext`의 유저 정보 즉시 동기화

---

### 4.3 홈 피드 및 게시물 인터랙션 (`/`)
1. **피드 카드 (`PostCard.jsx`)**
   - **헤더**: 작성자 아바타, `username`(클릭 시 프로필 이동), 위치 태그, 작성 상대 시간(`3시간 전`), 우측 `⋯` 옵션 메뉴(본인 게시물일 경우 삭제/수정)
   - **미디어 영역 (`ImageCarousel.jsx`)**:
     - 단일/다중 이미지 표시, 좌/우 화살표 버튼 및 하단 페이지 인디케이터 점(Dot)
     - 이미지 더블 클릭 시 중앙에 큰 하트 애니메이션과 함께 좋아요 실행
   - **액션 바**:
     - 좌측: 좋아요(하트) 토글 버튼, 댓글 아이콘(상세 모달 오픈), 공유 아이콘
     - 우측: 북마크(리본) 저장 토글 버튼
   - **하단 정보**:
     - `좋아요 N개`
     - 작성자 `username` + `caption` (긴 글일 경우 `... 더 보기` 클릭 시 전체 펼침, `#해시태그` 파란색 하이라이트)
     - `댓글 N개 모두 보기` 클릭 시 `PostDetailModal` 오픈
     - 하단 한 줄 댓글 입력창 (`Enter` 또는 **[게시]** 클릭 시 즉시 등록)
2. **새 게시물 만들기 모달 (`CreatePostModal.jsx`)**
   - **Step 1 (미디어 선택)**: 파일 드래그 앤 드롭 또는 컴퓨터에서 선택 (최대 10장, 미리보기 슬라이드 제공, 개별 이미지 삭제 가능)
   - **Step 2 (문구 입력)**: 우측 패널에 작성자 프로필 표시, `caption` 입력창(최대 2,200자), `location` 입력창 제공 후 **[공유하기]** 클릭 시 `multipart/form-data`로 전송

---

## 5. 디자인 시스템 및 반응형 가이드

| 구분 | 설정 값 | 비고 |
| :--- | :--- | :--- |
| **배경색 (Light)** | `#FFFFFF` (기본), `#FAFAFA` (보조 배경) | 깔끔한 화이트 톤 |
| **테두리 색상** | `#DBDBDB` (`border-gray-200`) | 카드, 구분선, 입력창 테두리 |
| **주요 포인트 컬러** | `#0095F6` (Instagram Blue) | 주요 버튼, 팔로우 버튼, 링크 |
| **좋아요 컬러** | `#FF3040` | 좋아요 활성화 하트 색상 |
| **데스크톱 (`>= 1024px`)** | 좌측 고정 사이드바(`244px`) + 중앙 메인 영역(`max-w-[630px]` 피드 / `max-w-[935px]` 프로필) + 우측 추천 패널(`320px`) | Instagram Web 표준 레이아웃 |
| **태블릿 (`768px ~ 1023px`)** | 좌측 아이콘 전용 미니 사이드바(`72px`) + 중앙 메인 영역 | 우측 추천 패널 숨김 |
| **모바일 (`< 768px`)** | 상단 헤더(`44px`) + 전체 폭 컨텐츠 + 하단 고정 네비게이션 탭바(`48px`) | 모바일 웹 최적화 |

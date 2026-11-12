import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { postApi } from '../api/postApi'
import { userApi } from '../api/userApi'
import { useAuth } from '../context/AuthContext'
import useInfinitePosts from '../utils/useInfinitePosts'
import Avatar from '../components/common/Avatar'
import FollowButton from '../components/common/FollowButton'
import Spinner, { PostSkeleton } from '../components/common/Spinner'
import UserRow from '../components/common/UserRow'
import PostCard from '../components/post/PostCard'
import StoryBar from '../components/story/StoryBar'

function Suggestions({ users, setUsers, compact }) {
  const setStatus = (id, s) => setUsers((us) => us.map((u) => (u.id === id ? { ...u, follow_status: s } : u)))
  if (!users.length) return null
  return (
    <div>
      {users.map((u) => (
        <UserRow
          key={u.id}
          user={u}
          size={compact ? 44 : 44}
          subtitle={u.full_name || '회원님을 위한 추천'}
          action={<FollowButton variant="text" username={u.username} status={u.follow_status} onChange={(s) => setStatus(u.id, s)} />}
        />
      ))}
    </div>
  )
}

export default function HomePage() {
  const { user } = useAuth()
  const [suggested, setSuggested] = useState([])
  const { posts, loading, done, initialized, sentinelRef } = useInfinitePosts(postApi.feed, {
    pageSize: 10,
    acceptCreated: () => true,
  })

  useEffect(() => {
    userApi.suggestions(5).then(setSuggested).catch(() => {})
  }, [])

  return (
    <div className="flex justify-center gap-16 md:pt-4">
      <div className="w-full max-w-[630px]">
        <StoryBar />
        <div className="mx-auto w-full max-w-[470px]">
          {!initialized ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : posts.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <h2 className="text-xl font-bold">Instagram에 오신 것을 환영합니다</h2>
              <p className="mt-2 text-ig-secondary">사람들을 팔로우하면 사진이 여기에 표시됩니다.</p>
              <div className="mt-6 rounded-lg border border-ig-border py-2 text-left">
                <Suggestions users={suggested} setUsers={setSuggested} />
              </div>
              <Link to="/explore" className="btn-primary mt-6 inline-block">
                탐색 탭에서 둘러보기
              </Link>
            </div>
          ) : (
            <>
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
              {!done && <div ref={sentinelRef} key={posts.length} className="h-4" />}
              {loading && <Spinner />}
              {done && (
                <div className="py-10 text-center text-ig-secondary">
                  <p className="font-semibold text-neutral-900">모두 확인했습니다</p>
                  <p className="mt-1 text-sm">최근 게시물을 모두 확인했습니다.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <aside className="hidden w-[320px] shrink-0 pt-6 xl:block">
        {user ? (
          <div className="flex items-center gap-3 px-4">
            <Link to={`/${user.username}`}>
              <Avatar user={user} size={44} />
            </Link>
            <div className="min-w-0 flex-1">
              <Link to={`/${user.username}`} className="block truncate text-sm font-semibold">
                {user.username}
              </Link>
              <div className="truncate text-sm text-ig-secondary">{user.full_name}</div>
            </div>
          </div>
        ) : (
          <div className="mx-4 rounded-xl border border-ig-border p-5 text-center">
            <p className="font-semibold">Instagram에 오신 것을 환영합니다</p>
            <p className="mt-1 text-sm text-ig-secondary">로그인하고 좋아요, 댓글, 팔로우, 게시물 작성을 시작해 보세요.</p>
            <Link to="/login" state={{ from: '/' }} className="btn-primary mt-4 block">
              로그인
            </Link>
            <Link to="/register" className="link-blue mt-3 inline-block text-sm">
              새 계정 만들기
            </Link>
          </div>
        )}
        {suggested.length > 0 && (
          <>
            <div className="mb-1 mt-6 flex items-center justify-between px-4">
              <span className="text-sm font-semibold text-ig-secondary">{user ? '회원님을 위한 추천' : '인기 계정'}</span>
              <Link to="/explore" className="text-xs font-semibold">
                모두 보기
              </Link>
            </div>
            <Suggestions users={suggested} setUsers={setSuggested} compact />
          </>
        )}
        <p className="mt-8 px-4 text-xs uppercase text-neutral-400">© 2026 Instagram Clone · React + FastAPI</p>
      </aside>
    </div>
  )
}

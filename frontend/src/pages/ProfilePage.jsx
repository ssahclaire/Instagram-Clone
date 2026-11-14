import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bookmark, Camera, Grid3X3, Lock } from 'lucide-react'
import { userApi } from '../api/userApi'
import { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useUI } from '../context/UIContext'
import useInfinitePosts from '../utils/useInfinitePosts'
import { GridSkeleton } from '../components/common/Spinner'
import Spinner from '../components/common/Spinner'
import ProfileHeader from '../components/profile/ProfileHeader'
import ProfilePostGrid from '../components/profile/ProfilePostGrid'

export default function ProfilePage({ tab: requestedTab = 'posts' }) {
  const { username } = useParams()
  const { user } = useAuth()
  const { openCreate } = useUI()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setProfile(null)
    setError(null)
    userApi.profile(username).then(setProfile).catch((e) => setError(e))
  }, [username])

  const isMe = profile?.is_me
  const tab = isMe ? requestedTab : 'posts' // only I can see my saved tab
  const showSaved = tab === 'saved'
  const enabled = !!profile && profile.can_view_posts

  const { posts, loading, done, initialized, sentinelRef } = useInfinitePosts(
    (skip, limit) => (showSaved ? userApi.saved(skip, limit) : userApi.posts(username, skip, limit)),
    {
      pageSize: 24,
      key: `${username}:${tab}:${profile?.can_view_posts}`,
      enabled,
      acceptCreated: (p) => !showSaved && p.author.username === username,
    },
  )

  // keep post count in sync when I create/delete posts on my own profile
  useEffect(() => {
    if (isMe && tab === 'posts' && done) setProfile((p) => (p ? { ...p, post_count: posts.length } : p))
  }, [posts.length, isMe, tab, done])

  if (error) {
    const notFound = error.response?.status === 404
    return (
      <div className="px-4 py-20 text-center">
        <h2 className="text-2xl font-semibold">{notFound ? '죄송합니다. 페이지를 사용할 수 없습니다.' : '오류'}</h2>
        <p className="mt-4">
          {notFound ? '클릭하신 링크가 잘못되었거나 페이지가 삭제되었습니다. ' : errorMessage(error)}
          <Link to="/" className="text-ig-link">
            인스타그램으로 돌아가기.
          </Link>
        </p>
      </div>
    )
  }
  if (!profile) return <Spinner className="pt-20" />

  const tabCls = (active) =>
    `flex items-center gap-1.5 py-4 text-xs font-semibold uppercase tracking-widest ${
      active ? '-mt-px border-t border-black text-black' : 'text-ig-secondary'
    }`

  return (
    <div className="mx-auto w-full max-w-[935px] md:px-5">
      <ProfileHeader profile={profile} setProfile={setProfile} />

      {!profile.can_view_posts ? (
        <div className="border-t border-ig-border px-4 py-14 text-center">
          <Lock size={48} strokeWidth={1} className="mx-auto mb-4 rounded-full border-2 border-black p-2.5" />
          <h3 className="font-semibold">비공개 계정입니다</h3>
          <p className="mt-1 text-sm text-ig-secondary">사진 및 동영상을 보려면 팔로우하세요.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-center gap-14 border-t border-ig-border">
            <Link to={`/${profile.username}`} className={tabCls(tab === 'posts')}>
              <Grid3X3 size={14} /> 게시물
            </Link>
            {isMe && (
              <Link to={`/${profile.username}/saved`} className={tabCls(tab === 'saved')}>
                <Bookmark size={14} /> 저장됨
              </Link>
            )}
          </div>

          {!initialized ? (
            <GridSkeleton />
          ) : posts.length === 0 ? (
            <div className="px-4 py-16 text-center">
              {showSaved ? (
                <>
                  <Bookmark size={62} strokeWidth={1} className="mx-auto mb-4 rounded-full border-2 border-black p-3" />
                  <h3 className="text-2xl font-extrabold">저장</h3>
                  <p className="mt-3 text-sm">다시 보고 싶은 사진을 저장하세요. 저장한 내용은 회원님만 볼 수 있습니다.</p>
                </>
              ) : (
                <>
                  <Camera size={62} strokeWidth={1} className="mx-auto mb-4 rounded-full border-2 border-black p-3" />
                  <h3 className="text-3xl font-extrabold">{isMe ? '사진 공유' : '게시물 없음'}</h3>
                  {isMe && (
                    <>
                      <p className="mt-3 text-sm">사진을 공유하면 회원님의 프로필에 표시됩니다.</p>
                      <button type="button" onClick={openCreate} className="link-blue mt-4 text-sm">
                        첫 사진 공유하기
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              <ProfilePostGrid posts={posts} />
              {!done && <div ref={sentinelRef} key={posts.length} className="h-4" />}
              {loading && <Spinner />}
            </>
          )}
        </>
      )}
    </div>
  )
}

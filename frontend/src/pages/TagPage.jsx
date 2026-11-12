import { useParams } from 'react-router-dom'
import { Hash } from 'lucide-react'
import { postApi } from '../api/postApi'
import useInfinitePosts from '../utils/useInfinitePosts'
import Spinner, { GridSkeleton } from '../components/common/Spinner'
import ProfilePostGrid from '../components/profile/ProfilePostGrid'

export default function TagPage() {
  const { tag } = useParams()
  const { posts, loading, done, initialized, sentinelRef } = useInfinitePosts(
    (skip, limit) => postApi.byTag(tag, skip, limit),
    { pageSize: 24, key: tag },
  )

  return (
    <div className="mx-auto w-full max-w-[935px] md:px-5">
      <header className="flex items-center gap-6 px-4 py-8 md:gap-12 md:px-16 md:py-12">
        <div className="flex h-[77px] w-[77px] shrink-0 items-center justify-center rounded-full border border-ig-border bg-ig-bg md:h-[152px] md:w-[152px]">
          <Hash className="h-8 w-8 md:h-16 md:w-16" strokeWidth={1.2} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl">#{tag}</h1>
          <p className="mt-2 text-base">
            게시물 <b>{done ? posts.length.toLocaleString() : `${posts.length}+`}</b>
          </p>
        </div>
      </header>
      <h2 className="px-4 pb-3 text-sm font-semibold text-ig-secondary md:px-0">최근 게시물</h2>
      {!initialized ? (
        <GridSkeleton />
      ) : posts.length === 0 ? (
        <p className="py-20 text-center text-ig-secondary">#{tag} 해시태그가 포함된 게시물이 없습니다.</p>
      ) : (
        <>
          <ProfilePostGrid posts={posts} />
          {!done && <div ref={sentinelRef} key={posts.length} className="h-4" />}
          {loading && <Spinner />}
        </>
      )}
    </div>
  )
}

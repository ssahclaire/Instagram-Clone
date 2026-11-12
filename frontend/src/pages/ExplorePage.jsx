import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { postApi } from '../api/postApi'
import useInfinitePosts from '../utils/useInfinitePosts'
import { SearchPanel } from '../components/common/SearchDrawer'
import Spinner, { GridSkeleton } from '../components/common/Spinner'
import ProfilePostGrid from '../components/profile/ProfilePostGrid'

export default function ExplorePage() {
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const { posts, loading, done, initialized, sentinelRef } = useInfinitePosts(postApi.explore, { pageSize: 24 })

  return (
    <div className="mx-auto w-full max-w-[935px] md:px-5 md:pt-6">
      {/* mobile search bar (desktop uses the sidebar search drawer) */}
      <div className="sticky top-0 z-20 flex items-center gap-2 bg-white px-4 py-2 md:hidden">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ig-secondary" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setSearching(true)}
            placeholder="검색"
            className="w-full rounded-lg bg-[#EFEFEF] py-2 pl-9 pr-8 outline-none"
          />
          {q && (
            <button type="button" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-ig-secondary">
              <X size={16} />
            </button>
          )}
        </div>
        {searching && (
          <button type="button" onClick={() => { setSearching(false); setQ('') }} className="text-sm font-semibold">
            취소
          </button>
        )}
      </div>

      {searching ? (
        <div className="min-h-[60vh] md:hidden">
          <SearchPanel query={q} onNavigate={() => setSearching(false)} />
        </div>
      ) : null}

      <div className={searching ? 'hidden md:block' : ''}>
        {!initialized ? (
          <GridSkeleton count={12} />
        ) : posts.length === 0 ? (
          <p className="py-20 text-center text-ig-secondary">아직 탐색할 게시물이 없습니다.</p>
        ) : (
          <>
            <ProfilePostGrid posts={posts} />
            {!done && <div ref={sentinelRef} key={posts.length} className="h-4" />}
            {loading && <Spinner />}
          </>
        )}
      </div>
    </div>
  )
}

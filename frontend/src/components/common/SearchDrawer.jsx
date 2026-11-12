import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Hash, X } from 'lucide-react'
import { userApi } from '../../api/userApi'
import Avatar from './Avatar'
import Spinner from './Spinner'

const RECENT_KEY = 'recent_searches'

function loadRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || []
  } catch {
    return []
  }
}

/** Search input + live results (users & hashtags). Used by the desktop drawer and the mobile explore page. */
export function SearchPanel({ onNavigate, autoFocus = false, query: controlledQuery }) {
  const [q, setQ] = useState('')
  const query = controlledQuery ?? q
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState(loadRecent)
  const inputRef = useRef()

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    const term = query.trim()
    if (!term) {
      setResults(null)
      return
    }
    setLoading(true)
    const t = setTimeout(() => {
      userApi
        .search(term)
        .then(setResults)
        .catch(() => setResults({ users: [], hashtags: [] }))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const remember = (item) => {
    const next = [item, ...recent.filter((r) => r.key !== item.key)].slice(0, 10)
    setRecent(next)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    onNavigate?.()
  }
  const clearRecent = () => {
    setRecent([])
    localStorage.removeItem(RECENT_KEY)
  }

  const userItem = (u) => (
    <Link
      key={`u${u.id}`}
      to={`/${u.username}`}
      onClick={() => remember({ key: `u:${u.username}`, type: 'user', user: u })}
      className="flex items-center gap-3 px-6 py-2 hover:bg-ig-hover"
    >
      <Avatar user={u} size={44} />
      <div className="min-w-0">
        <div className="truncate font-semibold">{u.username}</div>
        <div className="truncate text-ig-secondary">{u.full_name}</div>
      </div>
    </Link>
  )
  const tagItem = (t) => (
    <Link
      key={`t${t.name}`}
      to={`/explore/tags/${encodeURIComponent(t.name)}`}
      onClick={() => remember({ key: `t:${t.name}`, type: 'tag', tag: t })}
      className="flex items-center gap-3 px-6 py-2 hover:bg-ig-hover"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-ig-border">
        <Hash size={18} />
      </span>
      <div>
        <div className="font-semibold">#{t.name}</div>
        <div className="text-ig-secondary">게시물 {t.post_count.toLocaleString()}</div>
      </div>
    </Link>
  )

  return (
    <div className="flex h-full flex-col">
      {controlledQuery === undefined && (
        <div className="px-4 pb-6">
          <div className="relative">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="검색"
              className="w-full rounded-lg bg-[#EFEFEF] px-4 py-2.5 pr-9 outline-none"
            />
            {q && (
              <button type="button" onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-neutral-300 p-0.5 text-white">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto border-t border-ig-border pt-3">
        {!query.trim() ? (
          <>
            <div className="flex items-center justify-between px-6 pb-2 pt-1">
              <span className="text-base font-semibold">최근 검색 항목</span>
              {recent.length > 0 && (
                <button type="button" onClick={clearRecent} className="link-blue text-sm">
                  모두 지우기
                </button>
              )}
            </div>
            {recent.length === 0 ? (
              <p className="py-16 text-center font-semibold text-ig-secondary">최근 검색 내역 없음.</p>
            ) : (
              recent.map((r) => (r.type === 'user' ? userItem(r.user) : tagItem(r.tag)))
            )}
          </>
        ) : loading && !results ? (
          <Spinner />
        ) : results && results.users.length + results.hashtags.length === 0 ? (
          <p className="py-16 text-center text-ig-secondary">결과를 찾을 수 없습니다.</p>
        ) : (
          results && (
            <>
              {results.users.map(userItem)}
              {results.hashtags.map(tagItem)}
            </>
          )
        )}
      </div>
    </div>
  )
}

export default function SearchDrawer({ onClose }) {
  return (
    <Drawer onClose={onClose} title="검색">
      <SearchPanel onNavigate={onClose} autoFocus />
    </Drawer>
  )
}

/** Slide-out panel next to the collapsed sidebar (desktop/tablet). */
export function Drawer({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <aside className="fixed bottom-0 left-[72px] top-0 z-40 flex w-[397px] animate-fadeIn flex-col rounded-r-2xl border-r border-ig-border bg-white shadow-[4px_0_24px_rgba(0,0,0,0.15)]">
        <h2 className="px-6 pb-9 pt-6 text-2xl font-semibold">{title}</h2>
        <div className="min-h-0 flex-1">{children}</div>
      </aside>
    </>
  )
}

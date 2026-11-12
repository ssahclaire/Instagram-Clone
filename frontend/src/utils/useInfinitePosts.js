import { useCallback, useEffect, useRef, useState } from 'react'
import { useSyncedPosts } from './postStore'

/**
 * Paginated post list with IntersectionObserver-based infinite scroll.
 * fetchPage(skip, limit) => Promise<Post[]>. Reloads when `key` changes.
 */
export default function useInfinitePosts(fetchPage, { pageSize = 12, key = '', acceptCreated, enabled = true } = {}) {
  const [posts, setPosts] = useSyncedPosts([], acceptCreated)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)
  const [initialized, setInitialized] = useState(false)
  const state = useRef({ skip: 0, loading: false, done: false, gen: 0 })
  const fetchRef = useRef(fetchPage)
  fetchRef.current = fetchPage

  const loadMore = useCallback(async () => {
    const s = state.current
    if (s.loading || s.done) return
    s.loading = true
    setLoading(true)
    const gen = s.gen
    try {
      const page = await fetchRef.current(s.skip, pageSize)
      if (gen !== state.current.gen) return
      s.skip += page.length
      setPosts((ps) => {
        const seen = new Set(ps.map((p) => p.id))
        return [...ps, ...page.filter((p) => !seen.has(p.id))]
      })
      if (page.length < pageSize) {
        s.done = true
        setDone(true)
      }
    } catch (e) {
      if (gen === state.current.gen) {
        setError(e)
        s.done = true
        setDone(true)
      }
    } finally {
      if (gen === state.current.gen) {
        s.loading = false
        setLoading(false)
        setInitialized(true)
      }
    }
  }, [pageSize, setPosts])

  useEffect(() => {
    state.current = { skip: 0, loading: false, done: false, gen: state.current.gen + 1 }
    setPosts([])
    setDone(false)
    setError(null)
    setInitialized(false)
    if (enabled) loadMore()
  }, [key, enabled, loadMore, setPosts])

  const observer = useRef()
  const sentinelRef = useCallback(
    (node) => {
      observer.current?.disconnect()
      if (!node) return
      observer.current = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), { rootMargin: '600px' })
      observer.current.observe(node)
    },
    [loadMore],
  )

  return { posts, setPosts, loading, done, error, initialized, sentinelRef }
}

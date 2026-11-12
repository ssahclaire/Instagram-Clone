/**
 * Tiny pub/sub so a like/comment/delete in one place (e.g. the detail modal)
 * is reflected everywhere the same post is rendered (feed card, grids).
 */
import { useEffect, useRef, useState } from 'react'
import { postApi } from '../api/postApi'

const listeners = new Set()

/** patch: partial post | (prev) => partial | { deleted: true } | { created: post } */
export function emitPost(id, patch) {
  listeners.forEach((fn) => fn(id, patch))
}
export const emitPostCreated = (post) => emitPost(post.id, { created: post })
export const emitPostDeleted = (id) => emitPost(id, { deleted: true })

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function applyPatch(post, patch) {
  return { ...post, ...(typeof patch === 'function' ? patch(post) : patch) }
}

/** List of posts kept in sync. `acceptCreated(post)` decides whether new posts are prepended. */
export function useSyncedPosts(initial = [], acceptCreated) {
  const [posts, setPosts] = useState(initial)
  const acceptRef = useRef(acceptCreated)
  acceptRef.current = acceptCreated

  useEffect(
    () =>
      subscribe((id, patch) => {
        if (patch?.created) {
          if (acceptRef.current?.(patch.created)) setPosts((ps) => [patch.created, ...ps.filter((p) => p.id !== id)])
          return
        }
        if (patch?.deleted) {
          setPosts((ps) => ps.filter((p) => p.id !== id))
          return
        }
        setPosts((ps) => ps.map((p) => (p.id === id ? applyPatch(p, patch) : p)))
      }),
    [],
  )
  return [posts, setPosts]
}

export function useSyncedPost(initial = null) {
  const [post, setPost] = useState(initial)
  useEffect(
    () =>
      subscribe((id, patch) => {
        if (patch?.created) return
        setPost((p) => {
          if (!p || p.id !== id) return p
          return patch?.deleted ? { ...p, deleted: true } : applyPatch(p, patch)
        })
      }),
    [],
  )
  return [post, setPost]
}

// ---------- optimistic actions ----------

export async function toggleLike(post) {
  const prev = { is_liked: post.is_liked, like_count: post.like_count }
  emitPost(post.id, { is_liked: !prev.is_liked, like_count: prev.like_count + (prev.is_liked ? -1 : 1) })
  try {
    const r = await postApi.toggleLike(post.id)
    emitPost(post.id, { is_liked: r.liked, like_count: r.like_count })
  } catch (e) {
    emitPost(post.id, prev)
    throw e
  }
}

export async function toggleBookmark(post) {
  const prev = post.is_bookmarked
  emitPost(post.id, { is_bookmarked: !prev })
  try {
    const r = await postApi.toggleBookmark(post.id)
    emitPost(post.id, { is_bookmarked: r.bookmarked })
    return r.bookmarked
  } catch (e) {
    emitPost(post.id, { is_bookmarked: prev })
    throw e
  }
}

export async function addComment(postId, content, parentId = null) {
  const c = await postApi.addComment(postId, content, parentId)
  emitPost(postId, (p) => ({ comment_count: p.comment_count + 1 }))
  return c
}

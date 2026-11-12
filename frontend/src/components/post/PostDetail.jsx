import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'
import { postApi } from '../../api/postApi'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { addComment, emitPost, toggleLike, useSyncedPost } from '../../utils/postStore'
import { formatTime } from '../../utils/formatTime'
import RichText from '../../utils/RichText'
import useRequireAuth from '../../utils/useRequireAuth'
import Avatar from '../common/Avatar'
import Spinner from '../common/Spinner'
import { useToast } from '../common/Toast'
import ImageCarousel from './ImageCarousel'
import PostActions from './PostActions'
import PostOptions from './PostOptions'

function CommentItem({ comment, onReply, onDelete, canDelete, small }) {
  return (
    <div className="group flex gap-3 py-2">
      <Link to={`/${comment.author.username}`} className="shrink-0">
        <Avatar user={comment.author} size={small ? 28 : 32} />
      </Link>
      <div className="min-w-0 flex-1 text-sm">
        <div className="whitespace-pre-line break-words">
          <Link to={`/${comment.author.username}`} className="mr-1 font-semibold">
            {comment.author.username}
          </Link>
          <RichText text={comment.content} />
        </div>
        <div className="mt-1.5 flex gap-3 text-xs text-ig-secondary">
          <span>{formatTime(comment.created_at, { short: true })}</span>
          {onReply && (
            <button type="button" onClick={() => onReply(comment)} className="font-semibold">
              답글 달기
            </button>
          )}
          {canDelete && (
            <button type="button" onClick={() => onDelete(comment)} className="hidden font-semibold text-ig-red group-hover:inline">
              삭제
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Image on the left, author / comments / actions / comment box on the right. */
export default function PostDetail({ postId, onDeleted, layout = 'modal' }) {
  const { user } = useAuth()
  const toast = useToast()
  const [post, setPost] = useSyncedPost(null)
  const [comments, setComments] = useState(null)
  const [error, setError] = useState(null)
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [openReplies, setOpenReplies] = useState({})
  const [posting, setPosting] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const inputRef = useRef()
  const ensureAuth = useRequireAuth()

  useEffect(() => {
    let alive = true
    setPost(null)
    setComments(null)
    Promise.all([postApi.get(postId), postApi.comments(postId)])
      .then(([p, cs]) => {
        if (!alive) return
        setPost(p)
        setComments(cs)
      })
      .catch((e) => alive && setError(errorMessage(e, '게시물을 불러올 수 없습니다.')))
    return () => {
      alive = false
    }
  }, [postId, setPost])

  useEffect(() => {
    if (post?.deleted) onDeleted?.()
  }, [post?.deleted, onDeleted])

  const { roots, replies } = useMemo(() => {
    const roots = []
    const replies = {}
    for (const c of comments || []) {
      if (c.parent_id) (replies[c.parent_id] ||= []).push(c)
      else roots.push(c)
    }
    return { roots, replies }
  }, [comments])

  if (error) return <div className="flex h-full min-h-[300px] items-center justify-center p-8 text-ig-secondary">{error}</div>
  if (!post || !comments) return <div className="flex h-full min-h-[300px] w-full items-center justify-center bg-white"><Spinner /></div>

  const isOwner = !!user && post.author.id === user.id
  const canDelete = (c) => isOwner || (!!user && c.author.id === user.id)
  const startReply = (c) => {
    if (!ensureAuth()) return
    setReplyTo(c)
    setText(`@${c.author.username} `)
    inputRef.current?.focus()
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!text.trim() || posting) return
    setPosting(true)
    try {
      const parentId = replyTo ? replyTo.parent_id || replyTo.id : null
      const c = await addComment(post.id, text.trim(), parentId)
      setComments((cs) => [...cs, c])
      if (c.parent_id) setOpenReplies((o) => ({ ...o, [c.parent_id]: true }))
      setText('')
      setReplyTo(null)
    } catch (err) {
      toast(errorMessage(err))
    } finally {
      setPosting(false)
    }
  }

  const remove = async (c) => {
    try {
      await postApi.deleteComment(c.id)
      const removed = 1 + (c.parent_id ? 0 : (replies[c.id]?.length || 0))
      setComments((cs) => cs.filter((x) => x.id !== c.id && x.parent_id !== c.id))
      emitPost(post.id, (p) => ({ comment_count: Math.max(0, p.comment_count - removed) }))
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  const header = (
    <div className="flex items-center gap-3 border-b border-ig-border px-4 py-3">
      <Link to={`/${post.author.username}`}>
        <Avatar user={post.author} size={32} />
      </Link>
      <div className="min-w-0 flex-1 leading-tight">
        <Link to={`/${post.author.username}`} className="text-sm font-semibold">
          {post.author.username}
        </Link>
        {post.location && <div className="truncate text-xs">{post.location}</div>}
      </div>
      <button type="button" onClick={() => setOptionsOpen(true)} aria-label="옵션 더 보기">
        <MoreHorizontal size={22} />
      </button>
    </div>
  )

  return (
    <div className={`flex h-full w-full flex-col bg-white md:flex-row ${layout === 'page' ? 'border border-ig-border' : ''}`}>
      <div className="md:hidden">{header}</div>
      <div className="flex shrink-0 items-center bg-black md:h-full md:min-w-0 md:flex-1">
        <ImageCarousel
          images={post.images}
          fit="contain"
          className="aspect-square w-full md:aspect-auto md:h-full"
          onDoubleClick={() => ensureAuth() && !post.is_liked && toggleLike(post).catch(() => {})}
        />
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-col md:w-[405px] md:flex-none">
        <div className="hidden md:block">{header}</div>

        <div className="min-h-[120px] flex-1 overflow-y-auto px-4 py-2">
          {post.caption && (
            <div className="flex gap-3 py-2">
              <Avatar user={post.author} size={32} />
              <div className="min-w-0 text-sm">
                <div className="whitespace-pre-line break-words">
                  <Link to={`/${post.author.username}`} className="mr-1 font-semibold">
                    {post.author.username}
                  </Link>
                  <RichText text={post.caption} />
                </div>
                <div className="mt-1.5 text-xs text-ig-secondary">{formatTime(post.created_at, { short: true })}</div>
              </div>
            </div>
          )}
          {roots.length === 0 && !post.caption && (
            <div className="py-16 text-center">
              <p className="text-xl font-bold">아직 댓글이 없습니다.</p>
              <p className="mt-2 text-sm text-ig-secondary">댓글을 남겨보세요.</p>
            </div>
          )}
          {roots.map((c) => {
            const rs = replies[c.id] || []
            const open = openReplies[c.id]
            return (
              <div key={c.id}>
                <CommentItem comment={c} onReply={startReply} onDelete={remove} canDelete={canDelete(c)} />
                {rs.length > 0 && (
                  <div className="ml-11">
                    <button
                      type="button"
                      onClick={() => setOpenReplies((o) => ({ ...o, [c.id]: !open }))}
                      className="flex items-center gap-3 py-1 text-xs font-semibold text-ig-secondary"
                    >
                      <span className="inline-block w-6 border-b border-ig-secondary" />
                      {open ? '답글 숨기기' : `답글 보기(${rs.length}개)`}
                    </button>
                    {open &&
                      rs.map((r) => (
                        <CommentItem key={r.id} comment={r} small onReply={startReply} onDelete={remove} canDelete={canDelete(r)} />
                      ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="border-t border-ig-border px-4 pb-2">
          <PostActions post={post} onComment={() => ensureAuth() && inputRef.current?.focus()} />
          <div className="mt-1 text-[10px] uppercase tracking-wide text-ig-secondary">{formatTime(post.created_at)}</div>
        </div>

        {replyTo && (
          <div className="flex items-center justify-between bg-ig-bg px-4 py-2 text-xs text-ig-secondary">
            <span>@{replyTo.author.username}님에게 답글 남기는 중</span>
            <button type="button" onClick={() => { setReplyTo(null); setText('') }}>취소</button>
          </div>
        )}
        {!user ? (
          <div className="border-t border-ig-border px-4 py-3 text-sm">
            <button type="button" onClick={ensureAuth} className="link-blue">
              로그인
            </button>
            <span className="text-ig-secondary">하여 좋아요나 댓글을 남겨보세요.</span>
          </div>
        ) : (
        <form onSubmit={submit} className="flex items-center gap-2 border-t border-ig-border px-4 py-3">
          <Avatar user={user} size={28} />
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="댓글 달기..."
            className="flex-1 text-sm outline-none"
            maxLength={2200}
          />
          <button type="submit" disabled={!text.trim() || posting} className="link-blue text-sm disabled:opacity-40">
            게시
          </button>
        </form>
        )}
      </div>

      {optionsOpen && <PostOptions post={post} onClose={() => setOptionsOpen(false)} onDeleted={onDeleted} />}
    </div>
  )
}

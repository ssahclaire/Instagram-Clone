import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useUI } from '../../context/UIContext'
import useRequireAuth from '../../utils/useRequireAuth'
import { addComment, toggleLike } from '../../utils/postStore'
import { formatTime } from '../../utils/formatTime'
import RichText from '../../utils/RichText'
import Avatar from '../common/Avatar'
import { useToast } from '../common/Toast'
import ImageCarousel from './ImageCarousel'
import PostActions from './PostActions'
import PostOptions from './PostOptions'

const CAPTION_PREVIEW = 120

export default function PostCard({ post }) {
  const { openPost } = useUI()
  const toast = useToast()
  const [expanded, setExpanded] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [myComments, setMyComments] = useState([])
  const [posting, setPosting] = useState(false)
  const { user } = useAuth()
  const ensureAuth = useRequireAuth()

  const longCaption = post.caption.length > CAPTION_PREVIEW || post.caption.split('\n').length > 2
  const caption = expanded || !longCaption ? post.caption : post.caption.split('\n').slice(0, 2).join('\n').slice(0, CAPTION_PREVIEW)

  const dblLike = () => {
    if (!ensureAuth()) return
    if (!post.is_liked) toggleLike(post).catch((e) => toast(errorMessage(e)))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!comment.trim() || posting) return
    setPosting(true)
    try {
      const c = await addComment(post.id, comment.trim())
      setMyComments((cs) => [...cs, c])
      setComment('')
    } catch (err) {
      toast(errorMessage(err))
    } finally {
      setPosting(false)
    }
  }

  return (
    <article className="mb-4 border-b border-ig-border pb-4 md:mb-5">
      <header className="flex items-center gap-3 px-3 py-3 md:px-1">
        <Link to={`/${post.author.username}`}>
          <Avatar user={post.author} size={32} />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1 text-sm">
            <Link to={`/${post.author.username}`} className="font-semibold hover:opacity-60">
              {post.author.username}
            </Link>
            <span className="text-ig-secondary">• {formatTime(post.created_at, { short: true })}</span>
          </div>
          {post.location && <div className="truncate text-xs">{post.location}</div>}
        </div>
        <button type="button" onClick={() => setOptionsOpen(true)} className="p-1 hover:opacity-60" aria-label="옵션 더 보기">
          <MoreHorizontal size={22} />
        </button>
      </header>

      <ImageCarousel images={post.images} onDoubleClick={dblLike} className="md:rounded-[4px] md:border md:border-ig-border" />

      <div className="px-3 md:px-1">
        <PostActions post={post} onComment={() => openPost(post.id)} />

        {post.caption && (
          <div className="mt-1.5 whitespace-pre-line break-words text-sm">
            <Link to={`/${post.author.username}`} className="mr-1 font-semibold">
              {post.author.username}
            </Link>
            <RichText text={caption} />
            {longCaption && !expanded && (
              <button type="button" onClick={() => setExpanded(true)} className="text-ig-secondary">
                ... 더 보기
              </button>
            )}
          </div>
        )}

        {post.comment_count > 0 && (
          <button type="button" onClick={() => openPost(post.id)} className="mt-1.5 block text-sm text-ig-secondary">
            댓글 {post.comment_count.toLocaleString()}개 모두 보기
          </button>
        )}
        {myComments.map((c) => (
          <div key={c.id} className="mt-1 break-words text-sm">
            <span className="mr-1 font-semibold">{c.author.username}</span>
            <RichText text={c.content} />
          </div>
        ))}

        {user ? (
          <form onSubmit={submit} className="mt-1.5 flex items-center">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="댓글 달기..."
              className="flex-1 py-1 text-sm outline-none placeholder:text-ig-secondary"
              maxLength={2200}
            />
            {comment.trim() && (
              <button type="submit" disabled={posting} className="link-blue text-sm disabled:opacity-50">
                게시
              </button>
            )}
          </form>
        ) : (
          <button type="button" onClick={ensureAuth} className="mt-1.5 block py-1 text-left text-sm text-ig-secondary hover:text-neutral-900">
            로그인하고 댓글 달기...
          </button>
        )}
      </div>

      {optionsOpen && <PostOptions post={post} onClose={() => setOptionsOpen(false)} />}
    </article>
  )
}

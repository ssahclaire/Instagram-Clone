import { useState } from 'react'
import { Bookmark, Heart, MessageCircle, Send } from 'lucide-react'
import { errorMessage } from '../../api/client'
import { toggleBookmark, toggleLike } from '../../utils/postStore'
import { useToast } from '../common/Toast'
import { UserListModal } from '../profile/FollowListModal'
import { postApi } from '../../api/postApi'

/** Like / comment / share / bookmark row + like count. */
export default function PostActions({ post, onComment }) {
  const toast = useToast()
  const [bounce, setBounce] = useState(0)
  const [likersOpen, setLikersOpen] = useState(false)

  const like = () => {
    setBounce(Date.now())
    toggleLike(post).catch((e) => toast(errorMessage(e)))
  }
  const save = () =>
    toggleBookmark(post)
      .then((saved) => saved && toast('저장되었습니다.'))
      .catch((e) => toast(errorMessage(e)))
  const share = async () => {
    const url = `${window.location.origin}/p/${post.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast('링크를 클립보드에 복사했습니다.')
    } catch {
      toast(url)
    }
  }

  return (
    <div>
      <div className="flex items-center py-1.5">
        <button type="button" onClick={like} className="-ml-2 p-2 hover:opacity-60" aria-label={post.is_liked ? '좋아요 취소' : '좋아요'}>
          <Heart
            key={bounce}
            size={24}
            className={`${post.is_liked ? 'fill-ig-red text-ig-red' : ''} ${bounce ? 'animate-likeBounce' : ''}`}
          />
        </button>
        <button type="button" onClick={onComment} className="p-2 hover:opacity-60" aria-label="댓글 달기">
          <MessageCircle size={24} className="-scale-x-100" />
        </button>
        <button type="button" onClick={share} className="p-2 hover:opacity-60" aria-label="공유하기">
          <Send size={24} />
        </button>
        <button type="button" onClick={save} className="-mr-2 ml-auto p-2 hover:opacity-60" aria-label={post.is_bookmarked ? '저장 취소' : '저장'}>
          <Bookmark size={24} className={post.is_bookmarked ? 'fill-black' : ''} />
        </button>
      </div>
      {post.like_count > 0 ? (
        <button type="button" onClick={() => setLikersOpen(true)} className="text-sm font-semibold">
          좋아요 {post.like_count.toLocaleString()}개
        </button>
      ) : (
        <p className="text-sm">
          가장 먼저 <button type="button" onClick={like} className="font-semibold">좋아요</button>를 눌러보세요
        </p>
      )}
      {likersOpen && <UserListModal title="좋아요" load={() => postApi.likers(post.id)} onClose={() => setLikersOpen(false)} />}
    </div>
  )
}

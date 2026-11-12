import { Copy, Heart, MessageCircle } from 'lucide-react'
import { useUI } from '../../context/UIContext'
import { formatCount } from '../../utils/formatTime'

/** 3-column square grid; hover shows like/comment counts; click opens detail modal. */
export default function ProfilePostGrid({ posts }) {
  const { openPost } = useUI()
  return (
    <div className="grid grid-cols-3 gap-[3px] md:gap-1">
      {posts.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => openPost(p.id)}
          className="group relative aspect-square overflow-hidden bg-neutral-100"
          aria-label={`게시물 열기: ${p.caption.slice(0, 30)}`}
        >
          <img src={p.images[0]?.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
          {p.images.length > 1 && <Copy size={20} className="absolute right-2 top-2 text-white drop-shadow" />}
          <div className="absolute inset-0 hidden items-center justify-center gap-6 bg-black/40 text-base font-bold text-white group-hover:flex">
            <span className="flex items-center gap-1.5">
              <Heart size={20} className="fill-white" /> {formatCount(p.like_count)}
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle size={20} className="-scale-x-100 fill-white" /> {formatCount(p.comment_count)}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}

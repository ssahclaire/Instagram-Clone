import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react'

/**
 * Multi-image slider with arrows + dot indicators. Double-click triggers onDoubleClick
 * with a big heart animation. fit='cover' (square feed) or 'contain' (detail modal).
 */
export default function ImageCarousel({ images, onDoubleClick, fit = 'cover', className = '' }) {
  const [idx, setIdx] = useState(0)
  const [heartKey, setHeartKey] = useState(0)
  const touchX = useRef(null)
  const count = images.length
  const go = (d) => setIdx((i) => Math.min(count - 1, Math.max(0, i + d)))

  const dbl = () => {
    if (!onDoubleClick) return
    setHeartKey(Date.now())
    onDoubleClick()
  }

  return (
    <div
      className={`group relative select-none overflow-hidden ${fit === 'cover' ? 'aspect-square bg-neutral-100' : 'bg-black'} ${className}`}
      onDoubleClick={dbl}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
        touchX.current = null
      }}
    >
      <div className="flex h-full transition-transform duration-300 ease-out" style={{ transform: `translateX(-${idx * 100}%)` }}>
        {images.map((img, i) => (
          <img
            key={img.id ?? i}
            src={img.image_url}
            alt={`이미지 ${i + 1}`}
            draggable={false}
            loading={i === 0 ? 'eager' : 'lazy'}
            className={`h-full w-full shrink-0 ${fit === 'cover' ? 'object-cover' : 'object-contain'}`}
          />
        ))}
      </div>

      {heartKey > 0 && (
        <div key={heartKey} className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Heart size={110} className="animate-heartPop fill-white text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]" />
        </div>
      )}

      {idx > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); go(-1) }}
          onDoubleClick={(e) => e.stopPropagation()}
          className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-neutral-800 shadow hover:bg-white"
          aria-label="이전 이미지"
        >
          <ChevronLeft size={18} />
        </button>
      )}
      {idx < count - 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); go(1) }}
          onDoubleClick={(e) => e.stopPropagation()}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-neutral-800 shadow hover:bg-white"
          aria-label="다음 이미지"
        >
          <ChevronRight size={18} />
        </button>
      )}
      {count > 1 && (
        <>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
            {images.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full transition-colors ${i === idx ? 'bg-ig-blue' : 'bg-white/60'}`} />
            ))}
          </div>
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            {idx + 1}/{count}
          </span>
        </>
      )}
    </div>
  )
}

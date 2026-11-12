import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Pause, Play, Trash2, X } from 'lucide-react'
import { storyApi } from '../../api/postApi'
import { useAuth } from '../../context/AuthContext'
import { formatTime } from '../../utils/formatTime'
import Avatar from '../common/Avatar'

const DURATION = 5000
const SEEN_KEY = 'seen_stories'

function seenSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY)) || [])
  } catch {
    return new Set()
  }
}
function markSeen(id) {
  const s = seenSet()
  s.add(id)
  localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-500)))
}
export const isGroupSeen = (g) => {
  const s = seenSet()
  return g.stories.every((st) => s.has(st.id))
}

/** Full-screen story player: progress bars, 5s auto-advance, tap left/right, next user. */
export default function StoryViewer({ groups, startIndex, onClose, onDeleted }) {
  const { user } = useAuth()
  const [g, setG] = useState(startIndex)
  const [i, setI] = useState(() => {
    const s = seenSet()
    const first = groups[startIndex].stories.findIndex((st) => !s.has(st.id))
    return first === -1 ? 0 : first
  })
  const [paused, setPaused] = useState(false)
  const group = groups[g]
  const story = group?.stories[i]

  const next = useCallback(() => {
    if (i < group.stories.length - 1) setI(i + 1)
    else if (g < groups.length - 1) {
      setG(g + 1)
      setI(0)
    } else onClose()
  }, [i, g, group, groups.length, onClose])

  const prev = () => {
    if (i > 0) setI(i - 1)
    else if (g > 0) {
      setG(g - 1)
      setI(groups[g - 1].stories.length - 1)
    }
  }

  useEffect(() => {
    if (!story) return
    markSeen(story.id)
    if (paused) return
    const t = setTimeout(next, DURATION)
    return () => clearTimeout(t)
  }, [story, paused, next])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!story) return null

  const remove = async () => {
    await storyApi.remove(story.id)
    onDeleted?.()
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1a1a1a]">
      <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 text-white" aria-label="닫기">
        <X size={32} />
      </button>
      <div className="relative h-full max-h-[min(100vh,880px)] w-full max-w-[min(100vw,495px)] overflow-hidden bg-black md:rounded-lg">
        <img src={story.image_url} alt="" className="h-full w-full object-contain" />

        <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-3 pb-8">
          <div className="flex gap-1">
            {group.stories.map((s, k) => (
              <div key={s.id} className="h-[2px] flex-1 overflow-hidden rounded bg-white/35">
                <div
                  key={`${s.id}-${k === i}`}
                  className="h-full bg-white"
                  style={
                    k < i
                      ? { width: '100%' }
                      : k === i
                        ? { animation: `progress ${DURATION}ms linear forwards`, animationPlayState: paused ? 'paused' : 'running' }
                        : { width: 0 }
                  }
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-white">
            <Link to={`/${group.user.username}`} onClick={onClose} className="flex items-center gap-2">
              <Avatar user={group.user} size={32} />
              <span className="text-sm font-semibold">{group.user.username}</span>
            </Link>
            <span className="text-sm text-white/70">{formatTime(story.created_at, { short: true })}</span>
            <div className="ml-auto flex items-center gap-3">
              <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? '재생' : '일시정지'}>
                {paused ? <Play size={20} className="fill-white" /> : <Pause size={20} className="fill-white" />}
              </button>
              {group.user.id === user.id && (
                <button type="button" onClick={remove} aria-label="스토리 삭제">
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          </div>
        </div>

        <button type="button" className="absolute bottom-0 left-0 top-20 w-1/3" onClick={prev} aria-label="이전 스토리" />
        <button type="button" className="absolute bottom-0 right-0 top-20 w-2/3" onClick={next} aria-label="다음 스토리" />
      </div>
      {(g > 0 || i > 0) && (
        <button type="button" onClick={prev} className="absolute left-[calc(50%-290px)] hidden rounded-full bg-white/80 p-1 md:block" aria-label="이전">
          <ChevronLeft size={20} />
        </button>
      )}
      <button type="button" onClick={next} className="absolute right-[calc(50%-290px)] hidden rounded-full bg-white/80 p-1 md:block" aria-label="다음">
        <ChevronRight size={20} />
      </button>
    </div>,
    document.body,
  )
}

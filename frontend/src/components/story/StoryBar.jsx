import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { storyApi } from '../../api/postApi'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../common/Avatar'
import { useToast } from '../common/Toast'
import StoryViewer, { isGroupSeen } from './StoryViewer'

export default function StoryBar() {
  const { user } = useAuth()
  const toast = useToast()
  const [groups, setGroups] = useState([])
  const [viewing, setViewing] = useState(null) // group index
  const [, force] = useState(0)
  const inputRef = useRef()

  const load = () => storyApi.feed().then(setGroups).catch(() => {})
  useEffect(() => {
    load()
  }, [])

  const mine = groups.find((g) => g.user.id === user.id)
  const others = groups.filter((g) => g.user.id !== user.id)
  const ordered = mine ? [mine, ...others] : others

  const upload = async (file) => {
    if (!file) return
    try {
      await storyApi.create(file)
      toast('스토리가 추가되었습니다.')
      load()
    } catch (e) {
      toast(errorMessage(e))
    }
  }

  return (
    <div className="mb-2 flex gap-4 overflow-x-auto px-4 py-4 scrollbar-hide md:mb-6 md:px-0">
      <div className="flex w-[66px] shrink-0 flex-col items-center gap-1">
        <div className="relative">
          <Avatar
            user={user}
            size={56}
            ring={mine ? (isGroupSeen(mine) ? 'seen' : 'unseen') : undefined}
            onClick={() => (mine ? setViewing(0) : inputRef.current.click())}
            className={mine ? '' : 'p-[4px]'}
          />
          <button
            type="button"
            onClick={() => inputRef.current.click()}
            className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-ig-blue text-white"
            aria-label="스토리 추가"
          >
            <Plus size={12} strokeWidth={3} />
          </button>
        </div>
        <span className="w-full truncate text-center text-xs text-ig-secondary">내 스토리</span>
      </div>

      {others.map((g) => (
        <button
          key={g.user.id}
          type="button"
          onClick={() => setViewing(ordered.indexOf(g))}
          className="flex w-[66px] shrink-0 flex-col items-center gap-1"
        >
          <Avatar user={g.user} size={56} ring={isGroupSeen(g) ? 'seen' : 'unseen'} />
          <span className="w-full truncate text-center text-xs">{g.user.username}</span>
        </button>
      ))}

      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
      {viewing !== null && (
        <StoryViewer
          groups={ordered}
          startIndex={viewing}
          onClose={() => { setViewing(null); force((n) => n + 1) }}
          onDeleted={load}
        />
      )}
    </div>
  )
}

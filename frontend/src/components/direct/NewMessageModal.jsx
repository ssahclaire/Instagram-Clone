import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { userApi } from '../../api/userApi'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../common/Avatar'
import Modal from '../common/Modal'
import Spinner from '../common/Spinner'

/** Pick a user to start a conversation with. */
export default function NewMessageModal({ onClose, onPick }) {
  const { user: me } = useAuth()
  const [q, setQ] = useState('')
  const [users, setUsers] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef()

  useEffect(() => inputRef.current?.focus(), [])

  useEffect(() => {
    const term = q.trim()
    let cancelled = false
    setLoading(true)
    const t = setTimeout(() => {
      const req = term ? userApi.search(term).then((r) => r.users) : userApi.suggestions(10)
      req
        .then((list) => !cancelled && setUsers(list.filter((u) => u.id !== me?.id)))
        .catch(() => !cancelled && setUsers([]))
        .finally(() => !cancelled && setLoading(false))
    }, term ? 250 : 0)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q, me?.id])

  const pick = async (u) => {
    if (busy) return
    setBusy(true)
    try {
      await onPick(u)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} className="flex h-[min(520px,90vh)] w-[548px] max-w-full flex-col">
      <div className="relative border-b border-ig-border py-3 text-center text-base font-bold">
        새로운 메시지
        <button type="button" onClick={onClose} className="absolute right-3 top-2.5" aria-label="닫기">
          <X size={24} />
        </button>
      </div>
      <div className="flex items-center gap-4 border-b border-ig-border px-4 py-2">
        <span className="text-base font-semibold">받는 사람:</span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="검색..."
          className="flex-1 py-1.5 text-sm outline-none"
        />
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {!q.trim() && <div className="px-4 pb-2 text-sm font-semibold">추천</div>}
        {loading && users === null ? (
          <Spinner />
        ) : users?.length ? (
          users.map((u) => (
            <button
              key={u.id}
              type="button"
              disabled={busy}
              onClick={() => pick(u)}
              className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-ig-hover disabled:opacity-60"
            >
              <Avatar user={u} size={44} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{u.username}</span>
                <span className="block truncate text-sm text-ig-secondary">{u.full_name}</span>
              </span>
            </button>
          ))
        ) : (
          <p className="px-4 py-2 text-sm text-ig-secondary">{q.trim() ? '계정을 찾을 수 없습니다.' : '추천할 계정이 없습니다.'}</p>
        )}
      </div>
    </Modal>
  )
}

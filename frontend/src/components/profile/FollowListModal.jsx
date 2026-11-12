import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { userApi } from '../../api/userApi'
import Modal from '../common/Modal'
import FollowButton from '../common/FollowButton'
import Spinner from '../common/Spinner'
import UserRow from '../common/UserRow'

/** Generic user list modal (followers, following, likers). */
export function UserListModal({ title, load, onClose, renderAction }) {
  const [users, setUsers] = useState(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    load().then(setUsers).catch(() => setUsers([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setStatus = (id, follow_status) => setUsers((us) => us.map((u) => (u.id === id ? { ...u, follow_status } : u)))
  const shown = (users || []).filter(
    (u) => !filter || u.username.includes(filter.toLowerCase()) || u.full_name.toLowerCase().includes(filter.toLowerCase()),
  )

  return (
    <Modal onClose={onClose} className="flex max-h-[min(400px,80vh)] w-[400px] max-w-full flex-col">
      <div className="relative flex h-[43px] shrink-0 items-center justify-center border-b border-ig-border">
        <h2 className="font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="absolute right-3" aria-label="닫기">
          <X size={22} />
        </button>
      </div>
      {users && users.length > 6 && (
        <div className="px-4 pt-3">
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="검색" className="w-full rounded-lg bg-[#EFEFEF] px-4 py-1.5 outline-none" />
        </div>
      )}
      <div className="min-h-[200px] flex-1 overflow-y-auto py-2">
        {!users ? (
          <Spinner />
        ) : shown.length === 0 ? (
          <p className="py-12 text-center text-ig-secondary">표시할 사용자가 없습니다.</p>
        ) : (
          shown.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              onNavigate={onClose}
              action={
                renderAction
                  ? renderAction(u, setUsers)
                  : !u.is_me && (
                      <FollowButton username={u.username} status={u.follow_status} onChange={(s) => setStatus(u.id, s)} className="px-4" />
                    )
              }
            />
          ))
        )}
      </div>
    </Modal>
  )
}

export default function FollowListModal({ username, type, isMe, onClose, onCountChange }) {
  const title = type === 'followers' ? '팔로워' : '팔로잉'
  const load = () => (type === 'followers' ? userApi.followers(username) : userApi.following(username))

  // On my own followers list, show a "삭제" (remove follower) button like Instagram
  const renderAction =
    isMe && type === 'followers'
      ? (u, setUsers) => (
          <button
            type="button"
            className="btn-secondary px-4"
            onClick={async () => {
              await userApi.removeFollower(u.username)
              setUsers((us) => us.filter((x) => x.id !== u.id))
              onCountChange?.(-1)
            }}
          >
            삭제
          </button>
        )
      : undefined

  return <UserListModal title={title} load={load} onClose={onClose} renderAction={renderAction} />
}

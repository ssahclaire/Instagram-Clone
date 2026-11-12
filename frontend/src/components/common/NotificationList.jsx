import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { notificationApi } from '../../api/postApi'
import { userApi } from '../../api/userApi'
import { errorMessage } from '../../api/client'
import { useUI } from '../../context/UIContext'
import { formatTime } from '../../utils/formatTime'
import Avatar from './Avatar'
import FollowButton from './FollowButton'
import Spinner from './Spinner'
import { useToast } from './Toast'

const TEXT = {
  like: '님이 회원님의 게시물을 좋아합니다.',
  comment: '님이 댓글을 남겼습니다:',
  reply: '님이 회원님의 댓글에 답글을 남겼습니다:',
  follow: '님이 회원님을 팔로우하기 시작했습니다.',
  follow_request: '님이 팔로우를 요청했습니다.',
}

function groupLabel(iso) {
  const days = (Date.now() - new Date(iso).getTime()) / 86400000
  if (days < 1) return '오늘'
  if (days < 7) return '이번 주'
  if (days < 30) return '이번 달'
  return '이전 활동'
}

export default function NotificationList({ onNavigate, onRead }) {
  const [items, setItems] = useState(null)
  const { openPost } = useUI()
  const toast = useToast()

  useEffect(() => {
    notificationApi
      .list()
      .then((list) => {
        setItems(list)
        if (list.some((n) => !n.is_read)) notificationApi.readAll().then(() => onRead?.())
      })
      .catch(() => setItems([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setActorStatus = (actorId, follow_status) =>
    setItems((list) => list.map((n) => (n.actor.id === actorId ? { ...n, actor: { ...n.actor, follow_status } } : n)))

  const respond = async (n, accept) => {
    try {
      if (accept) {
        await userApi.acceptRequest(n.actor.username)
        setItems((list) => list.map((x) => (x.id === n.id ? { ...x, type: 'follow' } : x)))
      } else {
        await userApi.declineRequest(n.actor.username)
        setItems((list) => list.filter((x) => x.id !== n.id))
      }
    } catch (e) {
      toast(errorMessage(e))
    }
  }

  if (!items) return <Spinner />
  if (items.length === 0)
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-base font-semibold">회원님의 게시물 활동</p>
        <p className="mt-2 text-ig-secondary">다른 사람이 회원님의 게시물을 좋아하거나 댓글을 남기면 여기에 표시됩니다.</p>
      </div>
    )

  let lastGroup = null
  return (
    <div className="pb-6">
      {items.map((n) => {
        const group = groupLabel(n.created_at)
        const header = group !== lastGroup ? (lastGroup = group) : null
        return (
          <div key={n.id}>
            {header && <h3 className="px-6 pb-2 pt-4 text-base font-bold">{header}</h3>}
            <div className={`flex items-center gap-3 px-6 py-2 ${n.is_read ? '' : 'bg-sky-50/60'}`}>
              <Link to={`/${n.actor.username}`} onClick={onNavigate}>
                <Avatar user={n.actor} size={44} />
              </Link>
              <p className="min-w-0 flex-1 text-sm leading-[18px]">
                <Link to={`/${n.actor.username}`} onClick={onNavigate} className="font-semibold">
                  {n.actor.username}
                </Link>
                {TEXT[n.type]} {n.comment_text && <span className="break-words">{n.comment_text}</span>}{' '}
                <span className="text-ig-secondary">{formatTime(n.created_at, { short: true })}</span>
              </p>
              {n.type === 'follow_request' ? (
                <div className="flex gap-2">
                  <button type="button" className="btn-primary px-3" onClick={() => respond(n, true)}>
                    확인
                  </button>
                  <button type="button" className="btn-secondary px-3" onClick={() => respond(n, false)}>
                    삭제
                  </button>
                </div>
              ) : n.type === 'follow' ? (
                <FollowButton
                  username={n.actor.username}
                  status={n.actor.follow_status}
                  onChange={(s) => setActorStatus(n.actor.id, s)}
                  className="px-4"
                />
              ) : n.post_thumbnail ? (
                <button
                  type="button"
                  onClick={() => {
                    openPost(n.post_id)
                    onNavigate?.()
                  }}
                >
                  <img src={n.post_thumbnail} alt="" className="h-11 w-11 rounded object-cover" />
                </button>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

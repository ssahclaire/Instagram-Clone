import { Link } from 'react-router-dom'
import { SquarePen } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { formatTime } from '../../utils/formatTime'
import Avatar from '../common/Avatar'
import Spinner from '../common/Spinner'

/** Left pane of the inbox: my conversations, newest first. */
export default function ConversationList({ conversations, activeId, onNew }) {
  const { user } = useAuth()
  return (
    <>
      <div className="flex items-center justify-between px-6 pb-3 pt-6 md:pt-9">
        <h1 className="truncate text-xl font-bold">{user?.username}</h1>
        <button type="button" onClick={onNew} aria-label="새로운 메시지" title="새로운 메시지" className="p-1">
          <SquarePen size={24} />
        </button>
      </div>
      <div className="px-6 pb-2 pt-1 text-base font-bold">메시지</div>
      <div className="flex-1 overflow-y-auto">
        {conversations === null ? (
          <Spinner />
        ) : conversations.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-ig-secondary">
            <p>아직 메시지가 없습니다.</p>
            <button type="button" onClick={onNew} className="link-blue mt-3">
              메시지 보내기
            </button>
          </div>
        ) : (
          conversations.map((c) => {
            const unread = c.unread_count > 0
            const last = c.last_message
            return (
              <Link
                key={c.id}
                to={`/direct/t/${c.id}`}
                className={`flex items-center gap-3 px-6 py-2 hover:bg-ig-hover ${c.id === activeId ? 'bg-ig-hover' : ''}`}
              >
                <Avatar user={c.other_user} size={56} />
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm ${unread ? 'font-bold' : ''}`}>{c.other_user.full_name || c.other_user.username}</div>
                  <div className={`flex text-xs ${unread ? 'font-bold text-neutral-900' : 'text-ig-secondary'}`}>
                    <span className="truncate">
                      {last ? `${last.is_mine ? '나: ' : ''}${last.content}` : ''}
                    </span>
                    {last && <span className="shrink-0">&nbsp;· {formatTime(last.created_at, { short: true })}</span>}
                  </div>
                </div>
                {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-ig-blue" aria-label="읽지 않은 메시지" />}
              </Link>
            )
          })
        )}
      </div>
    </>
  )
}

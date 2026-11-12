import { Link } from 'react-router-dom'
import Avatar from './Avatar'

export default function UserRow({ user, subtitle, action, onNavigate, size = 44 }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <Link to={`/${user.username}`} onClick={onNavigate} className="shrink-0">
        <Avatar user={user} size={size} />
      </Link>
      <Link to={`/${user.username}`} onClick={onNavigate} className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{user.username}</div>
        <div className="truncate text-sm text-ig-secondary">{subtitle ?? user.full_name}</div>
      </Link>
      {action}
    </div>
  )
}

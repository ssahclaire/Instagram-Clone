import { useState } from 'react'
import { userApi } from '../../api/userApi'
import { errorMessage } from '../../api/client'
import { useToast } from './Toast'

const LABEL = { none: '팔로우', pending: '요청됨', accepted: '팔로잉' }

/** Follow / 팔로잉 / 요청됨 toggle. variant 'button' (filled) or 'text' (blue link style). */
export default function FollowButton({ username, status, onChange, variant = 'button', className = '' }) {
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const click = async (e) => {
    e.stopPropagation()
    setBusy(true)
    try {
      const r = await userApi.toggleFollow(username)
      onChange?.(r.follow_status, r)
    } catch (err) {
      toast(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (variant === 'text') {
    return (
      <button
        type="button"
        onClick={click}
        disabled={busy}
        className={`text-xs font-semibold ${status === 'none' ? 'text-ig-blue hover:text-ig-link' : 'text-neutral-900'} ${className}`}
      >
        {LABEL[status]}
      </button>
    )
  }
  return (
    <button type="button" onClick={click} disabled={busy} className={`${status === 'none' ? 'btn-primary' : 'btn-secondary'} ${className}`}>
      {LABEL[status]}
    </button>
  )
}

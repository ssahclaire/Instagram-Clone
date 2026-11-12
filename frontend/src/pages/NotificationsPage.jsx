import { useNavigate, useOutletContext } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import NotificationList from '../components/common/NotificationList'

/** Mobile notifications screen (desktop uses the sidebar drawer). */
export default function NotificationsPage() {
  const navigate = useNavigate()
  const { setUnread } = useOutletContext() || {}
  return (
    <div className="mx-auto w-full max-w-[600px]">
      <header className="sticky top-0 z-20 flex h-[44px] items-center border-b border-ig-border bg-white px-4">
        <button type="button" onClick={() => navigate(-1)} aria-label="뒤로" className="md:hidden">
          <ChevronLeft size={26} />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold md:text-left md:text-xl">알림</h1>
        <span className="w-[26px] md:hidden" />
      </header>
      <NotificationList onRead={() => setUnread?.(0)} />
    </div>
  )
}

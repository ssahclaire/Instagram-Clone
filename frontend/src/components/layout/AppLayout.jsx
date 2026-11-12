import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { notificationApi } from '../../api/postApi'
import { useUI } from '../../context/UIContext'
import SearchDrawer, { Drawer } from '../common/SearchDrawer'
import NotificationList from '../common/NotificationList'
import CreatePostModal from '../post/CreatePostModal'
import PostDetailModal from '../post/PostDetailModal'
import Sidebar, { MobileNav } from './Sidebar'

const POLL_MS = 30_000

export default function AppLayout() {
  const [panel, setPanel] = useState(null) // 'search' | 'notifications' | null
  const [unread, setUnread] = useState(0)
  const { openPostId, closePost, createOpen, closeCreate } = useUI()
  const { pathname } = useLocation()

  const refreshUnread = useCallback(() => {
    notificationApi.unreadCount().then(setUnread).catch(() => {})
  }, [])

  useEffect(() => {
    refreshUnread()
    const t = setInterval(refreshUnread, POLL_MS)
    return () => clearInterval(t)
  }, [refreshUnread])

  // close drawers / modals on navigation
  useEffect(() => {
    setPanel(null)
    closePost()
  }, [pathname, closePost])

  const closePanel = useCallback(() => setPanel(null), [])

  return (
    <div className="min-h-screen">
      <Sidebar panel={panel} setPanel={setPanel} unread={unread} />
      <MobileNav unread={unread} />

      {panel === 'search' && <SearchDrawer onClose={closePanel} />}
      {panel === 'notifications' && (
        <Drawer title="알림" onClose={closePanel}>
          <div className="h-full overflow-y-auto">
            <NotificationList onNavigate={closePanel} onRead={() => setUnread(0)} />
          </div>
        </Drawer>
      )}

      <main className={`pb-[48px] md:pb-0 md:pl-[72px] lg:pl-[244px] ${pathname === '/' ? 'pt-[44px] md:pt-0' : ''}`}>
        <Outlet context={{ refreshUnread, setUnread }} />
      </main>

      {createOpen && <CreatePostModal onClose={closeCreate} />}
      {openPostId && <PostDetailModal postId={openPostId} onClose={closePost} />}
    </div>
  )
}

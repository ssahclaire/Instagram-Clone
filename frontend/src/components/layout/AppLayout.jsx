import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { notificationApi } from '../../api/postApi'
import { directApi } from '../../api/directApi'
import { useAuth } from '../../context/AuthContext'
import { useUI } from '../../context/UIContext'
import { FullScreenLoader } from './ProtectedRoute'
import SearchDrawer, { Drawer } from '../common/SearchDrawer'
import NotificationList from '../common/NotificationList'
import CreatePostModal from '../post/CreatePostModal'
import PostDetailModal from '../post/PostDetailModal'
import Sidebar, { MobileNav } from './Sidebar'

const POLL_MS = 30_000

export default function AppLayout() {
  const [panel, setPanel] = useState(null) // 'search' | 'notifications' | null
  const [unread, setUnread] = useState(0)
  const [directUnread, setDirectUnread] = useState(0)
  const { openPostId, closePost, createOpen, closeCreate } = useUI()
  const { user, loading } = useAuth()
  const { pathname } = useLocation()

  const refreshUnread = useCallback(() => {
    notificationApi.unreadCount().then(setUnread).catch(() => {})
  }, [])
  const refreshDirectUnread = useCallback(() => {
    directApi.unreadCount().then(setDirectUnread).catch(() => {})
  }, [])

  useEffect(() => {
    if (!user) {
      setUnread(0)
      setDirectUnread(0)
      return
    }
    const refresh = () => {
      refreshUnread()
      refreshDirectUnread()
    }
    refresh()
    const t = setInterval(refresh, POLL_MS)
    return () => clearInterval(t)
  }, [user, refreshUnread, refreshDirectUnread])

  // close drawers / modals on navigation
  useEffect(() => {
    setPanel(null)
    closePost()
  }, [pathname, closePost])

  const closePanel = useCallback(() => setPanel(null), [])

  // 저장된 토큰으로 세션 복원 중에는 게스트 화면이 잠깐 보이지 않도록 대기
  if (loading) return <FullScreenLoader />

  return (
    <div className="min-h-screen">
      <Sidebar panel={panel} setPanel={setPanel} unread={unread} directUnread={directUnread} />
      <MobileNav unread={unread} directUnread={directUnread} />

      {panel === 'search' && <SearchDrawer onClose={closePanel} />}
      {panel === 'notifications' && user && (
        <Drawer title="알림" onClose={closePanel}>
          <div className="h-full overflow-y-auto">
            <NotificationList onNavigate={closePanel} onRead={() => setUnread(0)} />
          </div>
        </Drawer>
      )}

      <main
        className={`pb-[48px] md:pb-0 md:pl-[72px] ${pathname.startsWith('/direct') ? '' : 'lg:pl-[244px]'} ${
          pathname === '/' ? 'pt-[44px] md:pt-0' : ''
        }`}
      >
        <Outlet context={{ refreshUnread, setUnread, refreshDirectUnread }} />
      </main>

      {createOpen && user && <CreatePostModal onClose={closeCreate} />}
      {openPostId && <PostDetailModal postId={openPostId} onClose={closePost} />}
    </div>
  )
}

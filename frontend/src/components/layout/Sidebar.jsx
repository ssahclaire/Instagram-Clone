import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Compass, Heart, Home, LogOut, Menu, Search, Settings, SquarePlus, Bookmark, Camera } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useUI } from '../../context/UIContext'
import Avatar from '../common/Avatar'

function Item({ icon: Icon, label, active, onClick, to, collapsed, badge, children }) {
  const cls = `group flex w-full items-center gap-4 rounded-lg p-3 my-[2px] transition-colors hover:bg-ig-hover ${active ? 'font-bold' : ''}`
  const content = (
    <>
      <span className="relative transition-transform group-hover:scale-105">
        {children || <Icon size={26} strokeWidth={active ? 2.6 : 1.8} />}
        {badge > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ig-red px-1 text-[11px] font-bold text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className={`text-base ${collapsed ? 'hidden' : 'hidden lg:inline'}`}>{label}</span>
    </>
  )
  if (to) {
    return (
      <Link to={to} onClick={onClick} className={cls} title={label}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={cls} title={label}>
      {content}
    </button>
  )
}

/** Desktop (>=1024: 244px with labels) / tablet (768-1023: 72px icons) left navigation. */
export default function Sidebar({ panel, setPanel, unread }) {
  const { user, logout } = useAuth()
  const { openCreate } = useUI()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef()
  const collapsed = !!panel

  useEffect(() => {
    if (!moreOpen) return
    const close = (e) => !moreRef.current?.contains(e.target) && setMoreOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [moreOpen])

  const toggle = (name) => setPanel(panel === name ? null : name)
  const go = () => setPanel(null)

  return (
    <nav
      className={`fixed bottom-0 left-0 top-0 z-40 hidden flex-col border-r border-ig-border bg-white px-3 pb-5 pt-2 transition-[width] duration-200 md:flex ${
        collapsed ? 'w-[72px]' : 'w-[72px] lg:w-[244px]'
      }`}
    >
      <Link to="/" onClick={go} className="mb-4 flex h-[73px] items-center px-3 pt-4">
        <span className={`font-logo text-[30px] leading-none ${collapsed ? 'hidden' : 'hidden lg:inline'}`}>Instagram</span>
        <Camera size={26}className={collapsed ? 'block' : 'block lg:hidden'} />
      </Link>

      <div className="flex flex-1 flex-col">
        <Item to="/" icon={Home} label="홈" active={pathname === '/' && !panel} onClick={go} collapsed={collapsed} />
        <Item icon={Search} label="검색" active={panel === 'search'} onClick={() => toggle('search')} collapsed={collapsed} />
        <Item to="/explore" icon={Compass} label="탐색 탭" active={pathname.startsWith('/explore') && !panel} onClick={go} collapsed={collapsed} />
        <Item icon={Heart} label="알림" active={panel === 'notifications'} onClick={() => toggle('notifications')} collapsed={collapsed} badge={unread} />
        <Item icon={SquarePlus} label="만들기" onClick={() => { go(); openCreate() }} collapsed={collapsed} />
        <Item to={`/${user.username}`} label="프로필" active={pathname === `/${user.username}` && !panel} onClick={go} collapsed={collapsed}>
          <Avatar user={user} size={26} className={pathname === `/${user.username}` ? 'ring-2 ring-black ring-offset-1' : ''} />
        </Item>
      </div>

      <div className="relative" ref={moreRef}>
        {moreOpen && (
          <div className="absolute bottom-14 left-0 w-[266px] overflow-hidden rounded-2xl bg-white p-2 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
            <button type="button" className="flex w-full items-center gap-3 rounded-lg p-4 hover:bg-ig-hover" onClick={() => { setMoreOpen(false); navigate('/accounts/edit') }}>
              <Settings size={18} /> 설정
            </button>
            <button type="button" className="flex w-full items-center gap-3 rounded-lg p-4 hover:bg-ig-hover" onClick={() => { setMoreOpen(false); navigate(`/${user.username}/saved`) }}>
              <Bookmark size={18} /> 저장됨
            </button>
            <div className="my-2 h-[6px] bg-ig-bg" />
            <button type="button" className="flex w-full items-center gap-3 rounded-lg p-4 hover:bg-ig-hover" onClick={() => { logout(); navigate('/login') }}>
              <LogOut size={18} /> 로그아웃
            </button>
          </div>
        )}
        <Item icon={Menu} label="더 보기" active={moreOpen} onClick={() => setMoreOpen((v) => !v)} collapsed={collapsed} />
      </div>
    </nav>
  )
}

/** Mobile (<768px) top header + bottom tab bar. */
export function MobileNav({ unread }) {
  const { user } = useAuth()
  const { openCreate } = useUI()
  const { pathname } = useLocation()
  const tab = (to, Icon, label) => (
    <NavLink to={to} end aria-label={label} className="flex flex-1 items-center justify-center">
      {({ isActive }) => <Icon size={26} strokeWidth={isActive ? 2.6 : 1.8} />}
    </NavLink>
  )
  return (
    <>
      {pathname === '/' && (
        <header className="fixed left-0 right-0 top-0 z-30 flex h-[44px] items-center justify-between border-b border-ig-border bg-white px-4 md:hidden">
          <Link to="/" className="font-logo text-[28px] leading-none">
            Instagram
          </Link>
          <Link to="/notifications" className="relative" aria-label="알림">
            <Heart size={24} />
            {unread > 0 && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-ig-red" />}
          </Link>
        </header>
      )}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-[48px] items-center border-t border-ig-border bg-white md:hidden">
        {tab('/', Home, '홈')}
        {tab('/explore', Compass, '탐색')}
        <button type="button" onClick={openCreate} className="flex flex-1 items-center justify-center" aria-label="만들기">
          <SquarePlus size={26} strokeWidth={1.8} />
        </button>
        {tab('/notifications', Heart, '알림')}
        <NavLink to={`/${user.username}`} end className="flex flex-1 items-center justify-center" aria-label="프로필">
          {({ isActive }) => <Avatar user={user} size={26} className={isActive ? 'ring-2 ring-black ring-offset-1' : ''} />}
        </NavLink>
      </nav>
    </>
  )
}

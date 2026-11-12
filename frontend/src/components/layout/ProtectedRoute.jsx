import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../common/Spinner'

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size={36} />
    </div>
  )
}

/** Only for logged-in users; otherwise redirect to /login (remembering where they were going). */
export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname, needLogin: true }} />
  return <Outlet />
}

/** Only for guests (login/register); logged-in users go home. */
export function GuestRoute() {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

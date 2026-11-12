import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Guard for actions that need an account (like, comment, save, follow, post...).
 * Usage:  const ensureAuth = useRequireAuth();  if (!ensureAuth()) return
 * Returns true when logged in; otherwise sends the guest to /login and returns false.
 * After logging in, the user comes back to the page they were on.
 */
export default function useRequireAuth() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback(() => {
    if (user) return true
    navigate('/login', { state: { from: location.pathname + location.search, needLogin: true } })
    return false
  }, [user, navigate, location.pathname, location.search])
}

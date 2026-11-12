import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../api/authApi'
import { TOKEN_KEY } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY))

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return
    authApi
      .me()
      .then(setUser)
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  const acceptToken = useCallback((data) => {
    localStorage.setItem(TOKEN_KEY, data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  const login = useCallback(async (identifier, password) => acceptToken(await authApi.login(identifier, password)), [acceptToken])
  const register = useCallback(async (form) => acceptToken(await authApi.register(form)), [acceptToken])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [])

  const updateUser = useCallback((next) => setUser((prev) => ({ ...prev, ...next })), [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateUser }),
    [user, loading, login, register, logout, updateUser],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

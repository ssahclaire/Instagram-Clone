import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { FloatingInput } from './AuthCard'

export default function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const canSubmit = identifier.trim() && password.length > 0 && !busy

  const submit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError('')
    try {
      await login(identifier.trim(), password)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(errorMessage(err, '아이디 또는 비밀번호가 일치하지 않습니다.'))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col">
      <FloatingInput label="사용자 이름 또는 이메일" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoFocus />
      <FloatingInput
        label="비밀번호"
        type={show ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        right={
          password && (
            <button type="button" onClick={() => setShow((s) => !s)} className="px-2 text-sm font-semibold">
              {show ? '숨기기' : '비밀번호 표시'}
            </button>
          )
        }
      />
      <button type="submit" disabled={!canSubmit} className="btn-primary mt-3">
        {busy ? '로그인 중…' : '로그인'}
      </button>
      {error && <p className="mt-4 text-center text-sm text-ig-red">{error}</p>}
    </form>
  )
}

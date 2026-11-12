import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { FloatingInput } from './AuthCard'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_RE = /^[a-z0-9._]{1,30}$/

function validate(f) {
  return {
    email: f.email && !EMAIL_RE.test(f.email) ? '올바른 이메일 주소를 입력하세요.' : '',
    username:
      f.username && !USERNAME_RE.test(f.username)
        ? '사용자 이름에는 영문 소문자, 숫자, 밑줄(_), 마침표(.)만 사용할 수 있습니다.'
        : '',
    password: f.password && f.password.length < 8 ? '비밀번호는 8자 이상이어야 합니다.' : '',
  }
}

export default function RegisterForm() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', full_name: '', username: '', password: '' })
  const [show, setShow] = useState(false)
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)

  const errors = validate(form)
  const filled = form.email && form.username && form.password
  const valid = filled && !errors.email && !errors.username && !errors.password
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const mark = (k) =>
    form[k] ? (
      errors[k] ? <XCircle size={22} className="mx-2 shrink-0 text-ig-red" /> : <CheckCircle2 size={22} className="mx-2 shrink-0 text-neutral-400" />
    ) : null

  const submit = async (e) => {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setServerError('')
    try {
      await register({ ...form, email: form.email.trim(), full_name: form.full_name.trim() })
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setServerError(errorMessage(err))
      setBusy(false)
    }
  }

  const firstError = errors.email || errors.username || errors.password

  return (
    <form onSubmit={submit} className="flex flex-col">
      <p className="mb-4 text-center text-[17px] font-semibold leading-5 text-ig-secondary">친구들의 사진과 동영상을 보려면 가입하세요.</p>
      <FloatingInput label="이메일 주소" type="email" value={form.email} onChange={set('email')} invalid={!!errors.email} right={mark('email')} autoComplete="email" autoFocus />
      <FloatingInput label="성명" value={form.full_name} onChange={set('full_name')} maxLength={50} autoComplete="name" />
      <FloatingInput
        label="사용자 이름"
        value={form.username}
        onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))}
        invalid={!!errors.username}
        right={mark('username')}
        maxLength={30}
        autoComplete="username"
      />
      <FloatingInput
        label="비밀번호"
        type={show ? 'text' : 'password'}
        value={form.password}
        onChange={set('password')}
        invalid={!!errors.password}
        autoComplete="new-password"
        right={
          form.password && (
            <button type="button" onClick={() => setShow((s) => !s)} className="px-2 text-sm font-semibold">
              {show ? '숨기기' : '표시'}
            </button>
          )
        }
      />
      {firstError && <p className="mt-1 text-xs text-ig-red">{firstError}</p>}
      <button type="submit" disabled={!valid || busy} className="btn-primary mt-4">
        {busy ? '가입 중…' : '가입'}
      </button>
      {serverError && <p className="mt-4 text-center text-sm text-ig-red">{serverError}</p>}
    </form>
  )
}

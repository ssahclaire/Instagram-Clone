import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userApi } from '../api/userApi'
import { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/common/Avatar'
import { useToast } from '../components/common/Toast'
import AvatarUploadModal from '../components/profile/AvatarUploadModal'

const BIO_MAX = 150

function Field({ label, hint, children }) {
  return (
    <div className="mb-6">
      <label className="mb-2 block text-base font-semibold">{label}</label>
      {children}
      {hint && <p className="mt-2 text-xs text-ig-secondary">{hint}</p>}
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-neutral-900' : 'bg-neutral-300'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

const inputCls = 'w-full rounded-xl border border-ig-border px-4 py-3 text-sm outline-none focus:border-neutral-500'

function ProfileForm() {
  const { user, updateUser } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: user.full_name,
    username: user.username,
    website: user.website,
    bio: user.bio,
    is_private: user.is_private,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const dirty = Object.keys(form).some((k) => form[k] !== user[k])
  const usernameValid = /^[a-z0-9._]{1,30}$/.test(form.username)

  const submit = async (e) => {
    e.preventDefault()
    if (!usernameValid) {
      setError('사용자 이름에는 영문 소문자, 숫자, 밑줄(_), 마침표(.)만 사용할 수 있습니다.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const me = await userApi.updateProfile(form)
      updateUser(me)
      setForm({ full_name: me.full_name, username: me.username, website: me.website, bio: me.bio, is_private: me.is_private })
      toast('프로필이 저장되었습니다.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="mb-8 flex items-center gap-4 rounded-2xl bg-[#EFEFEF] p-4">
        <Avatar user={user} size={56} onClick={() => setAvatarOpen(true)} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{user.username}</div>
          <div className="truncate text-sm text-ig-secondary">{user.full_name}</div>
        </div>
        <button type="button" onClick={() => setAvatarOpen(true)} className="btn-primary">
          사진 변경
        </button>
      </div>

      <Field label="이름" hint="사람들이 이름, 별명 또는 비즈니스 이름 등 회원님의 알려진 이름을 사용하여 회원님의 계정을 찾을 수 있도록 도와주세요.">
        <input value={form.full_name} onChange={set('full_name')} maxLength={50} className={inputCls} placeholder="이름" />
      </Field>
      <Field label="사용자 이름">
        <input
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))}
          maxLength={30}
          className={`${inputCls} ${usernameValid ? '' : 'border-ig-red'}`}
          placeholder="사용자 이름"
        />
      </Field>
      <Field label="웹사이트">
        <input value={form.website} onChange={set('website')} maxLength={255} className={inputCls} placeholder="https://..." />
      </Field>
      <Field label="소개">
        <div className="relative">
          <textarea
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value.slice(0, BIO_MAX) }))}
            rows={3}
            className={`${inputCls} resize-none pb-7`}
            placeholder="소개"
          />
          <span className="absolute bottom-3 right-4 text-xs text-ig-secondary">
            {form.bio.length} / {BIO_MAX}
          </span>
        </div>
      </Field>
      <Field label="비공개 계정">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-ig-border p-4">
          <p className="text-sm">
            계정이 비공개 상태인 경우 회원님이 승인한 사람만 회원님의 사진을 볼 수 있습니다.
          </p>
          <Toggle checked={form.is_private} onChange={(v) => setForm((f) => ({ ...f, is_private: v }))} />
        </div>
      </Field>

      {error && <p className="mb-4 text-sm text-ig-red">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => navigate(`/${user.username}`)} className="btn-secondary px-6">
          프로필 보기
        </button>
        <button type="submit" disabled={!dirty || saving} className="btn-primary px-10 py-2.5">
          {saving ? '저장 중…' : '제출'}
        </button>
      </div>
      {avatarOpen && <AvatarUploadModal onClose={() => setAvatarOpen(false)} />}
    </form>
  )
}

function PasswordForm() {
  const toast = useToast()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const canSubmit = form.current && form.next.length >= 8 && form.next === form.confirm && !saving

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.next !== form.confirm) return setError('새 비밀번호가 일치하지 않습니다.')
    setSaving(true)
    try {
      await userApi.changePassword(form.current, form.next)
      setForm({ current: '', next: '', confirm: '' })
      toast('비밀번호가 변경되었습니다.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <Field label="이전 비밀번호">
        <input type="password" value={form.current} onChange={set('current')} className={inputCls} autoComplete="current-password" />
      </Field>
      <Field label="새 비밀번호" hint="8자 이상 입력하세요.">
        <input type="password" value={form.next} onChange={set('next')} className={inputCls} autoComplete="new-password" />
      </Field>
      <Field label="새 비밀번호 확인">
        <input type="password" value={form.confirm} onChange={set('confirm')} className={`${inputCls} ${form.confirm && form.confirm !== form.next ? 'border-ig-red' : ''}`} autoComplete="new-password" />
      </Field>
      {error && <p className="mb-4 text-sm text-ig-red">{error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={!canSubmit} className="btn-primary px-10 py-2.5">
          {saving ? '변경 중…' : '비밀번호 변경'}
        </button>
      </div>
    </form>
  )
}

export default function EditProfilePage() {
  const [section, setSection] = useState('profile')
  const navCls = (active) => `w-full rounded-lg px-4 py-3 text-left text-sm ${active ? 'bg-[#EFEFEF] font-semibold' : 'hover:bg-ig-hover'}`
  return (
    <div className="mx-auto flex w-full max-w-[935px] flex-col md:flex-row">
      <aside className="flex shrink-0 gap-2 border-ig-border px-4 pt-6 md:w-[260px] md:flex-col md:border-r md:pr-4 md:pt-10">
        <h1 className="mb-4 hidden px-4 text-xl font-bold md:block">설정</h1>
        <button type="button" className={navCls(section === 'profile')} onClick={() => setSection('profile')}>
          프로필 편집
        </button>
        <button type="button" className={navCls(section === 'password')} onClick={() => setSection('password')}>
          비밀번호 변경
        </button>
      </aside>
      <section className="w-full max-w-[700px] px-4 py-8 md:px-12 md:py-10">
        <h2 className="mb-8 text-xl font-bold">{section === 'profile' ? '프로필 편집' : '비밀번호 변경'}</h2>
        {section === 'profile' ? <ProfileForm /> : <PasswordForm />}
      </section>
    </div>
  )
}

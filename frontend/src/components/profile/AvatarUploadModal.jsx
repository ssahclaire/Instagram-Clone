import { useRef, useState } from 'react'
import { userApi } from '../../api/userApi'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import Modal from '../common/Modal'
import { useToast } from '../common/Toast'

/** 사진 업로드 / 현재 사진 삭제 / 취소 */
export default function AvatarUploadModal({ onClose, onChange }) {
  const { user, updateUser } = useAuth()
  const toast = useToast()
  const inputRef = useRef()
  const [busy, setBusy] = useState(false)

  const apply = (me, msg) => {
    updateUser(me)
    onChange?.(me)
    toast(msg)
    onClose()
  }

  const upload = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      apply(await userApi.uploadAvatar(file), '프로필 사진이 추가되었습니다.')
    } catch (e) {
      toast(errorMessage(e))
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      apply(await userApi.deleteAvatar(), '프로필 사진이 삭제되었습니다.')
    } catch (e) {
      toast(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <Modal onClose={busy ? undefined : onClose} className="w-[400px] max-w-full">
      <h2 className="px-8 pb-6 pt-8 text-center text-xl font-normal">프로필 사진 바꾸기</h2>
      <div className="flex flex-col divide-y divide-ig-border border-t border-ig-border">
        <button type="button" disabled={busy} onClick={() => inputRef.current.click()} className="min-h-[48px] text-sm font-bold text-ig-blue disabled:opacity-50">
          {busy ? '처리 중…' : '사진 업로드'}
        </button>
        {user.profile_image_url && (
          <button type="button" disabled={busy} onClick={remove} className="min-h-[48px] text-sm font-bold text-ig-red disabled:opacity-50">
            현재 사진 삭제
          </button>
        )}
        <button type="button" disabled={busy} onClick={onClose} className="min-h-[48px] text-sm">
          취소
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
    </Modal>
  )
}

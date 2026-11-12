import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { postApi } from '../../api/postApi'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { emitPost, emitPostDeleted } from '../../utils/postStore'
import Modal, { ActionSheet } from '../common/Modal'
import Avatar from '../common/Avatar'
import { useToast } from '../common/Toast'

/** "⋯" action sheet: edit/delete for own posts, go to post / copy link for all. */
export default function PostOptions({ post, onClose, onDeleted }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [mode, setMode] = useState('menu') // menu | confirmDelete | edit
  const isMine = !!user && post.author.id === user.id

  const link = `${window.location.origin}/p/${post.id}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      toast('링크를 클립보드에 복사했습니다.')
    } catch {
      toast(link)
    }
    onClose()
  }

  const remove = async () => {
    try {
      await postApi.remove(post.id)
      emitPostDeleted(post.id)
      toast('게시물이 삭제되었습니다.')
      onClose()
      onDeleted?.()
    } catch (e) {
      toast(errorMessage(e))
    }
  }

  if (mode === 'confirmDelete') {
    return (
      <ActionSheet
        onClose={onClose}
        title={
          <div>
            <div>게시물을 삭제할까요?</div>
            <div className="mt-1 text-sm font-normal text-ig-secondary">이 게시물을 삭제하시겠어요?</div>
          </div>
        }
        actions={[{ label: '삭제', danger: true, onClick: remove }]}
      />
    )
  }
  if (mode === 'edit') return <EditPostModal post={post} onClose={onClose} />

  const actions = []
  if (isMine) {
    actions.push({ label: '삭제', danger: true, onClick: () => setMode('confirmDelete') })
    actions.push({ label: '수정', onClick: () => setMode('edit') })
  }
  actions.push({ label: '게시물로 이동', onClick: () => { onClose(); navigate(`/p/${post.id}`) } })
  actions.push({ label: '링크 복사', onClick: copy })
  actions.push({ label: '이 계정 정보', onClick: () => { onClose(); navigate(`/${post.author.username}`) } })
  return <ActionSheet onClose={onClose} actions={actions} />
}

function EditPostModal({ post, onClose }) {
  const { user } = useAuth()
  const toast = useToast()
  const [caption, setCaption] = useState(post.caption)
  const [location, setLocation] = useState(post.location)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const updated = await postApi.update(post.id, { caption, location })
      emitPost(post.id, { caption: updated.caption, location: updated.location, updated_at: updated.updated_at })
      toast('게시물이 수정되었습니다.')
      onClose()
    } catch (e) {
      toast(errorMessage(e))
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} className="flex max-h-[90vh] w-[860px] max-w-full flex-col">
      <div className="flex items-center justify-between border-b border-ig-border px-4 py-2.5">
        <button type="button" onClick={onClose} className="text-sm">취소</button>
        <h2 className="font-semibold">정보 수정</h2>
        <button type="button" onClick={save} disabled={saving} className="link-blue text-sm disabled:opacity-50">완료</button>
      </div>
      <div className="flex min-h-0 flex-col md:flex-row">
        <img src={post.images[0]?.image_url} alt="" className="aspect-square w-full bg-black object-contain md:w-1/2" />
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-3 flex items-center gap-3">
            <Avatar user={user} size={28} />
            <span className="font-semibold">{user.username}</span>
          </div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 2200))}
            rows={8}
            className="w-full resize-none text-base outline-none"
            placeholder="문구를 입력하세요..."
          />
          <div className="text-right text-xs text-ig-secondary">{caption.length.toLocaleString()}/2,200</div>
          <label className="mt-3 flex items-center border-y border-ig-border py-3">
            <input value={location} onChange={(e) => setLocation(e.target.value.slice(0, 100))} placeholder="위치 추가" className="flex-1 outline-none" />
            <MapPin size={18} />
          </label>
        </div>
      </div>
    </Modal>
  )
}

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Images, MapPin, Plus, X } from 'lucide-react'
import { postApi } from '../../api/postApi'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { emitPostCreated } from '../../utils/postStore'
import Modal, { ActionSheet } from '../common/Modal'
import Avatar from '../common/Avatar'
import { useToast } from '../common/Toast'

const MAX_FILES = 10
const MAX_CAPTION = 2200

/** Step 1: pick / drop images. Step 2: preview carousel + caption + location → multipart upload. */
export default function CreatePostModal({ onClose }) {
  const { user } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState([]) // { file, url }
  const [idx, setIdx] = useState(0)
  const [step, setStep] = useState(1)
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const inputRef = useRef()
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.url)), [])

  const addFiles = (fileList) => {
    const imgs = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    if (imgs.length === 0) {
      toast('이미지 파일만 업로드할 수 있습니다.')
      return
    }
    const room = MAX_FILES - items.length
    if (imgs.length > room) toast(`이미지는 최대 ${MAX_FILES}장까지 선택할 수 있습니다.`)
    const added = imgs.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }))
    if (added.length === 0) return
    setItems((cur) => [...cur, ...added])
    setIdx(items.length)
    setStep(2)
  }

  const removeCurrent = () => {
    const target = items[idx]
    URL.revokeObjectURL(target.url)
    const next = items.filter((_, i) => i !== idx)
    setItems(next)
    setIdx((i) => Math.max(0, Math.min(i, next.length - 1)))
    if (next.length === 0) setStep(1)
  }

  const requestClose = () => {
    if (uploading) return
    if (items.length) setConfirmDiscard(true)
    else onClose()
  }

  const share = async () => {
    setUploading(true)
    try {
      const post = await postApi.create({ files: items.map((i) => i.file), caption, location }, (e) =>
        setProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      )
      emitPostCreated(post)
      toast('게시물이 공유되었습니다.')
      onClose()
    } catch (e) {
      toast(errorMessage(e))
      setUploading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  return (
    <>
      <Modal onClose={requestClose} showClose closeOnBackdrop={!uploading} className={`flex flex-col ${step === 1 ? 'w-[min(90vw,700px)]' : 'w-[min(95vw,1040px)]'}`}>
        <div className="flex h-[42px] items-center justify-between border-b border-ig-border px-4">
          {step === 2 ? (
            <button type="button" onClick={() => setConfirmDiscard(true)} disabled={uploading} aria-label="뒤로">
              <ArrowLeft size={22} />
            </button>
          ) : (
            <span className="w-6" />
          )}
          <h2 className="font-semibold">새 게시물 만들기</h2>
          {step === 2 ? (
            <button type="button" onClick={share} disabled={uploading} className="link-blue text-sm disabled:opacity-50">
              {uploading ? `공유 중… ${progress}%` : '공유하기'}
            </button>
          ) : (
            <span className="w-6" />
          )}
        </div>

        {step === 1 ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex aspect-square max-h-[70vh] w-full flex-col items-center justify-center gap-4 transition-colors ${dragging ? 'bg-sky-50' : ''}`}
          >
            <Images size={80} strokeWidth={1} />
            <p className="text-xl">사진을 여기에 끌어다 놓으세요</p>
            <button type="button" className="btn-primary" onClick={() => inputRef.current.click()}>
              컴퓨터에서 선택
            </button>
            <p className="text-xs text-ig-secondary">최대 {MAX_FILES}장 · JPG, PNG, WEBP, GIF</p>
          </div>
        ) : (
          <div className="flex max-h-[80vh] min-h-0 flex-col overflow-y-auto md:flex-row md:overflow-visible">
            <div
              className="relative aspect-square w-full shrink-0 bg-black md:w-[min(60vw,640px)]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
            >
              <img src={items[idx]?.url} alt="미리보기" className="h-full w-full object-contain" />
              {idx > 0 && (
                <button type="button" onClick={() => setIdx(idx - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white">
                  <ChevronLeft size={18} />
                </button>
              )}
              {idx < items.length - 1 && (
                <button type="button" onClick={() => setIdx(idx + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white">
                  <ChevronRight size={18} />
                </button>
              )}
              <div className="absolute bottom-3 left-3 right-3 flex items-end gap-2 overflow-x-auto scrollbar-hide">
                {items.map((it, i) => (
                  <button
                    key={it.url}
                    type="button"
                    onClick={() => setIdx(i)}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded ${i === idx ? 'ring-2 ring-white' : 'opacity-60'}`}
                  >
                    <img src={it.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
                {items.length < MAX_FILES && (
                  <button
                    type="button"
                    onClick={() => inputRef.current.click()}
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/60 bg-black/50 text-white"
                    aria-label="사진 추가"
                  >
                    <Plus size={22} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={removeCurrent}
                className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-white"
                aria-label="이 사진 삭제"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex w-full flex-col md:w-[340px]">
              <div className="flex items-center gap-3 px-4 pt-4">
                <Avatar user={user} size={28} />
                <span className="font-semibold">{user.username}</span>
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
                rows={7}
                placeholder="문구를 입력하세요... (#해시태그, @멘션 지원)"
                className="mx-4 mt-3 resize-none text-base outline-none"
                autoFocus
              />
              <div className="px-4 pb-2 text-right text-xs text-ig-secondary">
                {caption.length.toLocaleString()}/{MAX_CAPTION.toLocaleString()}
              </div>
              <label className="flex items-center border-y border-ig-border px-4 py-3">
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value.slice(0, 100))}
                  placeholder="위치 추가"
                  className="flex-1 outline-none"
                />
                <MapPin size={18} />
              </label>
              {uploading && (
                <div className="mx-4 mt-4 h-1 overflow-hidden rounded bg-neutral-200">
                  <div className="h-full bg-ig-blue transition-[width]" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </Modal>

      {confirmDiscard && (
        <ActionSheet
          onClose={() => setConfirmDiscard(false)}
          title={
            <div>
              <div>게시물을 삭제하시겠어요?</div>
              <div className="mt-1 text-sm font-normal text-ig-secondary">지금 나가면 수정 내용이 저장되지 않습니다.</div>
            </div>
          }
          actions={[{ label: '삭제', danger: true, onClick: onClose }]}
        />
      )}
    </>
  )
}

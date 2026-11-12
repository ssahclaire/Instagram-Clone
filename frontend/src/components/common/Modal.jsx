import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/** Centered modal with dark backdrop. Closes on Escape and backdrop click. */
export default function Modal({ onClose, children, className = '', showClose = false, closeOnBackdrop = true }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-black/65 p-4"
      onMouseDown={(e) => closeOnBackdrop && e.target === e.currentTarget && onClose?.()}
    >
      {showClose && (
        <button type="button" onClick={onClose} className="absolute right-4 top-4 text-white" aria-label="닫기">
          <X size={28} />
        </button>
      )}
      <div className={`max-h-full overflow-hidden rounded-xl bg-white shadow-xl ${className}`} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>,
    document.body,
  )
}

/** Instagram-style vertical action sheet (list of full-width buttons). */
export function ActionSheet({ onClose, title, actions }) {
  return (
    <Modal onClose={onClose} className="w-[400px] max-w-full">
      {title && <div className="border-b border-ig-border px-8 py-6 text-center text-lg font-semibold">{title}</div>}
      <div className="flex flex-col divide-y divide-ig-border">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            disabled={a.disabled}
            className={`min-h-[48px] px-4 py-3 text-sm active:bg-neutral-100 disabled:opacity-50 ${
              a.danger ? 'font-bold text-ig-red' : a.primary ? 'font-bold text-ig-blue' : ''
            }`}
          >
            {a.label}
          </button>
        ))}
        <button type="button" onClick={onClose} className="min-h-[48px] px-4 py-3 text-sm active:bg-neutral-100">
          취소
        </button>
      </div>
    </Modal>
  )
}

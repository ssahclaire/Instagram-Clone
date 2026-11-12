import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef()

  const show = useCallback((message) => {
    clearTimeout(timer.current)
    setToast({ message, key: Date.now() })
    timer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          key={toast.key}
          role="status"
          className="fixed bottom-16 left-1/2 z-[70] animate-slideUp whitespace-nowrap rounded-lg bg-neutral-800 px-4 py-3 text-sm text-white shadow-lg md:bottom-8"
          style={{ transform: 'translateX(-50%)' }}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

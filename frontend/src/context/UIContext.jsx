import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/** Global modal state: post detail modal, create-post modal. */
const UIContext = createContext(null)

export function UIProvider({ children }) {
  const [openPostId, setOpenPostId] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)

  const openPost = useCallback((id) => setOpenPostId(id), [])
  const closePost = useCallback(() => setOpenPostId(null), [])
  const openCreate = useCallback(() => setCreateOpen(true), [])
  const closeCreate = useCallback(() => setCreateOpen(false), [])

  const value = useMemo(
    () => ({ openPostId, openPost, closePost, createOpen, openCreate, closeCreate }),
    [openPostId, openPost, closePost, createOpen, openCreate, closeCreate],
  )
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export const useUI = () => useContext(UIContext)

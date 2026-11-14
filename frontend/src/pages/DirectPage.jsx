import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { Send } from 'lucide-react'
import { directApi } from '../api/directApi'
import { errorMessage } from '../api/client'
import ChatThread from '../components/direct/ChatThread'
import ConversationList from '../components/direct/ConversationList'
import NewMessageModal from '../components/direct/NewMessageModal'
import { useToast } from '../components/common/Toast'

const POLL_MS = 5000

/** /direct (inbox) and /direct/t/:conversationId (inbox + open thread). Mobile shows one pane at a time. */
export default function DirectPage() {
  const { conversationId } = useParams()
  const activeId = conversationId ? Number(conversationId) : null
  const navigate = useNavigate()
  const toast = useToast()
  const { refreshDirectUnread } = useOutletContext() ?? {}
  const [conversations, setConversations] = useState(null)
  const [newOpen, setNewOpen] = useState(false)

  const loadList = useCallback(() => {
    directApi.conversations().then(setConversations).catch(() => setConversations((c) => c ?? []))
  }, [])

  useEffect(() => {
    loadList()
    const t = setInterval(loadList, POLL_MS)
    return () => clearInterval(t)
  }, [loadList])

  // Something changed in the open thread (sent / read / unsent): refresh the list and nav badge.
  const onActivity = useCallback(() => {
    loadList()
    refreshDirectUnread?.()
  }, [loadList, refreshDirectUnread])

  const startWith = async (u) => {
    try {
      const c = await directApi.start(u.username)
      setNewOpen(false)
      navigate(`/direct/t/${c.id}`)
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  return (
    <div className="flex h-[calc(100dvh-48px)] md:h-[100dvh]">
      <aside
        className={`${activeId ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-ig-border md:w-[350px] md:border-r lg:w-[397px]`}
      >
        <ConversationList conversations={conversations} activeId={activeId} onNew={() => setNewOpen(true)} />
      </aside>

      <section className={`${activeId ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>
        {activeId ? (
          <ChatThread key={activeId} conversationId={activeId} onActivity={onActivity} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-neutral-900">
              <Send size={48} strokeWidth={1.2} className="-ml-1 mt-1" />
            </div>
            <h2 className="mt-4 text-xl">내 메시지</h2>
            <p className="mt-1 text-sm text-ig-secondary">친구에게 비공개 메시지를 보내보세요.</p>
            <button type="button" onClick={() => setNewOpen(true)} className="btn-primary mt-4">
              메시지 보내기
            </button>
          </div>
        )}
      </section>

      {newOpen && <NewMessageModal onClose={() => setNewOpen(false)} onPick={startWith} />}
    </div>
  )
}

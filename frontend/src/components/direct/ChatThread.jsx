import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, MoreHorizontal } from 'lucide-react'
import { directApi } from '../../api/directApi'
import { errorMessage } from '../../api/client'
import Avatar from '../common/Avatar'
import { ActionSheet } from '../common/Modal'
import Spinner from '../common/Spinner'
import { useToast } from '../common/Toast'

const POLL_MS = 3000
const PAGE = 50
const GAP_MS = 60 * 60 * 1000 // show a time divider when messages are an hour apart

function dividerLabel(iso) {
  const d = new Date(iso)
  const now = new Date()
  const time = d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return time
  const sameYear = d.getFullYear() === now.getFullYear()
  const date = d.toLocaleDateString('ko-KR', sameYear ? { month: 'long', day: 'numeric' } : { year: 'numeric', month: 'long', day: 'numeric' })
  return `${date} ${time}`
}

/** Right pane: one conversation. Polls for new messages and read receipts. */
export default function ChatThread({ conversationId, onActivity }) {
  const toast = useToast()
  const [conv, setConv] = useState(null)
  const [messages, setMessages] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [menuFor, setMenuFor] = useState(null)
  const [error, setError] = useState(null)
  const listRef = useRef()
  const inputRef = useRef()
  const stickToBottom = useRef(true)
  const keepOffset = useRef(null) // scroll restore after prepending older messages
  const lastIdRef = useRef(0)

  const scrollToBottom = () => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }

  // initial load
  useEffect(() => {
    let cancelled = false
    setConv(null)
    setMessages(null)
    setError(null)
    setText('')
    stickToBottom.current = true
    lastIdRef.current = 0
    Promise.all([directApi.conversation(conversationId), directApi.messages(conversationId, { limit: PAGE })])
      .then(([c, msgs]) => {
        if (cancelled) return
        setConv(c)
        setMessages(msgs)
        setHasMore(msgs.length === PAGE)
        lastIdRef.current = msgs.at(-1)?.id ?? 0
        if (c.unread_count > 0) directApi.markRead(conversationId).then(onActivity).catch(() => {})
      })
      .catch((err) => !cancelled && setError(errorMessage(err, '대화를 불러올 수 없습니다.')))
    inputRef.current?.focus()
    return () => {
      cancelled = true
    }
  }, [conversationId, onActivity])

  // polling for new messages + read receipts
  useEffect(() => {
    if (!conv) return
    let cancelled = false
    const tick = async () => {
      try {
        const [fresh, c] = await Promise.all([
          directApi.messages(conversationId, { after_id: lastIdRef.current }),
          directApi.conversation(conversationId),
        ])
        if (cancelled) return
        setConv(c)
        if (fresh.length) {
          const el = listRef.current
          stickToBottom.current = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80
          lastIdRef.current = fresh.at(-1).id
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id))
            return [...prev, ...fresh.filter((m) => !seen.has(m.id))]
          })
          if (fresh.some((m) => !m.is_mine)) {
            await directApi.markRead(conversationId)
            onActivity()
          }
        }
      } catch {
        /* keep polling */
      }
    }
    const t = setInterval(tick, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [conv?.id, conversationId, onActivity]) // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    const el = listRef.current
    if (!el || !messages) return
    if (keepOffset.current != null) {
      el.scrollTop = el.scrollHeight - keepOffset.current
      keepOffset.current = null
    } else if (stickToBottom.current) {
      scrollToBottom()
    }
  }, [messages])

  const loadOlder = useCallback(async () => {
    if (!hasMore || loadingOlder || !messages?.length) return
    setLoadingOlder(true)
    try {
      const older = await directApi.messages(conversationId, { before_id: messages[0].id, limit: PAGE })
      keepOffset.current = listRef.current.scrollHeight - listRef.current.scrollTop
      setHasMore(older.length === PAGE)
      setMessages((prev) => [...older, ...prev])
    } catch {
      /* ignore */
    } finally {
      setLoadingOlder(false)
    }
  }, [hasMore, loadingOlder, messages, conversationId])

  const onScroll = (e) => {
    if (e.currentTarget.scrollTop < 60) loadOlder()
  }

  const send = async (e) => {
    e?.preventDefault()
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    try {
      const m = await directApi.send(conversationId, content)
      setText('')
      stickToBottom.current = true
      lastIdRef.current = Math.max(lastIdRef.current, m.id)
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
      onActivity()
    } catch (err) {
      toast(errorMessage(err))
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const unsend = async (m) => {
    setMenuFor(null)
    try {
      await directApi.unsend(m.id)
      stickToBottom.current = false
      setMessages((prev) => prev.filter((x) => x.id !== m.id))
      onActivity()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  const onKeyDown = (e) => {
    // Korean IME: Enter while composing only finishes the syllable.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) send(e)
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-ig-secondary">
        <p>{error}</p>
        <Link to="/direct" className="link-blue">받은 메시지함으로</Link>
      </div>
    )
  }
  if (!conv || !messages) return <div className="flex flex-1 items-center justify-center"><Spinner /></div>

  const other = conv.other_user
  // My last message that the other person has read → "읽음" under it; otherwise "전송됨" under my latest.
  const myLast = [...messages].reverse().find((m) => m.is_mine)
  const lastIsMine = messages.at(-1)?.is_mine

  return (
    <>
      <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-ig-border px-4 md:h-[75px]">
        <Link to="/direct" className="-ml-1 md:hidden" aria-label="뒤로">
          <ChevronLeft size={28} />
        </Link>
        <Link to={`/${other.username}`} className="flex min-w-0 items-center gap-3">
          <Avatar user={other} size={44} />
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold">{other.full_name || other.username}</span>
            <span className="block truncate text-xs text-ig-secondary">{other.username}</span>
          </span>
        </Link>
      </header>

      <div ref={listRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-4">
        {loadingOlder && <Spinner size={20} className="py-2" />}
        {!hasMore && (
          <div className="flex flex-col items-center pb-8 pt-4 text-center">
            <Avatar user={other} size={96} />
            <div className="mt-3 text-xl font-semibold">{other.full_name || other.username}</div>
            <div className="text-sm text-ig-secondary">{other.username} · Instagram</div>
            <Link to={`/${other.username}`} className="btn-secondary mt-4">
              프로필 보기
            </Link>
          </div>
        )}

        {messages.map((m, i) => {
          const prev = messages[i - 1]
          const next = messages[i + 1]
          const showDivider = !prev || new Date(m.created_at) - new Date(prev.created_at) > GAP_MS
          const nextBreaks = !next || next.is_mine !== m.is_mine ||
            new Date(next.created_at) - new Date(m.created_at) > GAP_MS
          return (
            <Fragment key={m.id}>
              {showDivider && (
                <div className="py-3 text-center text-xs font-semibold text-ig-secondary">{dividerLabel(m.created_at)}</div>
              )}
              <div className={`group flex items-end gap-2 ${m.is_mine ? 'justify-end' : 'justify-start'} ${nextBreaks ? 'mb-2' : 'mb-0.5'}`}>
                {!m.is_mine && (
                  <span className="w-7 shrink-0">{nextBreaks && <Avatar user={other} size={28} />}</span>
                )}
                {m.is_mine && (
                  <button
                    type="button"
                    onClick={() => setMenuFor(m)}
                    className="invisible self-center p-1 text-ig-secondary group-hover:visible"
                    aria-label="메시지 옵션"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                )}
                <div
                  title={dividerLabel(m.created_at)}
                  className={`max-w-[70%] whitespace-pre-wrap break-words rounded-[22px] px-3 py-2 text-[15px] leading-5 ${
                    m.is_mine ? 'bg-ig-blue text-white' : 'bg-[#EFEFEF] text-neutral-900'
                  }`}
                >
                  {m.content}
                </div>
              </div>
              {m.is_mine && m.id === myLast?.id && lastIsMine && (
                <div className="mb-2 pr-1 text-right text-xs text-ig-secondary">
                  {conv.other_last_read_id >= m.id ? '읽음' : '전송됨'}
                </div>
              )}
            </Fragment>
          )
        })}
      </div>

      <form onSubmit={send} className="shrink-0 px-4 pb-4 pt-1">
        <div className="flex items-end gap-2 rounded-[22px] border border-ig-border px-4 py-1.5">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={1000}
            placeholder="메시지 입력..."
            aria-label="메시지 입력"
            className="max-h-[120px] min-h-[28px] flex-1 resize-none py-1 text-[15px] leading-5 outline-none [field-sizing:content]"
          />
          {text.trim() && (
            <button type="submit" disabled={sending} className="py-1 text-sm font-semibold text-ig-blue hover:text-ig-link disabled:opacity-50">
              보내기
            </button>
          )}
        </div>
      </form>

      {menuFor && (
        <ActionSheet
          onClose={() => setMenuFor(null)}
          actions={[{ label: '전송 취소', danger: true, onClick: () => unsend(menuFor) }]}
        />
      )}
    </>
  )
}

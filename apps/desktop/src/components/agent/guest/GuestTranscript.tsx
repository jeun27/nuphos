import { useLayoutEffect, useMemo, useRef } from 'react'

import { t } from '../../../i18n'
import { MessageResponse } from '../MessageResponse'
import { fromPersistedMessages } from '../panel/persistence'
import { UserMessage } from '../panel/UserMessage'

import { toolSummary } from './guestModel'

import type { AgentPersistedMessage } from '../../../api/agent-types'
import type { Message } from '../panel/model'
import type { TextPart } from '../panel/parts'

/** An agent's reply as a guest reads it: its words, and a count of the tools it used. */
function AgentReply({ message }: { message: Message }) {
  const texts = message.parts.filter((part): part is TextPart => part.type === 'text')
  const tools = toolSummary(message.parts)

  if (texts.length === 0 && !tools) return null

  return (
    <div className="flex flex-col gap-2 text-[14px] text-main">
      {texts.map((part, index) => (
        <MessageResponse key={index}>{part.text}</MessageResponse>
      ))}
      {tools && <div className="text-[12px] text-tertiary">{tools}</div>}
    </div>
  )
}

/**
 * The chat's latest messages, drawn with the transcript's own pieces but none
 * of its controls. It keeps to the bottom as messages arrive unless the guest
 * scrolled up to read.
 */
export function GuestTranscript({
  sessionId,
  messages: persisted,
  working,
}: {
  sessionId: string
  messages: AgentPersistedMessage[]
  working: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinned = useRef(true)
  const messages = useMemo(() => fromPersistedMessages(persisted), [persisted])

  useLayoutEffect(() => {
    pinned.current = true
  }, [sessionId])
  useLayoutEffect(() => {
    const node = scrollRef.current

    if (node && pinned.current) node.scrollTop = node.scrollHeight
  }, [messages, sessionId])

  const onScroll = () => {
    const node = scrollRef.current

    if (node) pinned.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80
  }

  return (
    <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-[760px] flex-col gap-5 px-6 py-6">
        {messages.length === 0 && (
          <div className="py-10 text-center text-[13px] text-tertiary">{t('No messages yet')}</div>
        )}
        {messages.map((message) =>
          message.role === 'user' ? (
            <UserMessage key={message.id} message={message} showPlans={false} />
          ) : (
            <AgentReply key={message.id} message={message} />
          ),
        )}
        {working && (
          <div className="flex items-center gap-2 text-[12.5px] text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {t('Working')}
          </div>
        )}
      </div>
    </div>
  )
}

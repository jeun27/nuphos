import { Clock3 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { api } from '../../../api'
import { t } from '../../../i18n'

import { queuedFromOthers } from './roomModel'
import { useRoom } from './useRoom'

import type { QueuedOnServer } from '../../../api/agent-types'

// Teammates queue while a turn runs, which the viewer's own stream never
// reports, so the strip re-reads the queue on this beat until the turn ends.
const POLL_MS = 4_000

/** What teammates sent while the agent was busy, in the order it will run them. */
export function RoomQueue({
  sessionId,
  teamId,
  streaming,
  sidebar = false,
}: {
  sessionId: string
  teamId: string
  streaming: boolean
  sidebar?: boolean
}) {
  const { people } = useRoom(sessionId, teamId)
  const [queue, setQueue] = useState<QueuedOnServer[]>([])
  // A chat nobody else is in has no one else's messages to wait on.
  const shared = people.length > 1

  useEffect(() => {
    if (!streaming || !shared) return
    let current = true
    const read = () =>
      api
        .agentListQueue(sessionId, teamId)
        .then(({ messages }) => {
          if (current) setQueue(messages)
        })
        .catch(() => {})
    const timer = window.setInterval(() => void read(), POLL_MS)

    void read()

    return () => {
      current = false
      window.clearInterval(timer)
    }
  }, [sessionId, teamId, streaming, shared])

  // A queue read during an earlier turn is stale once that turn has ended.
  const items = streaming && shared ? queuedFromOthers(queue, people) : []

  if (items.length === 0) return null

  return (
    <div className={sidebar ? 'w-full' : 'mx-auto w-full max-w-[760px]'}>
      <div className="px-1 text-xs text-tertiary">{t('Queued from teammates')}</div>
      <div className="flex flex-col gap-1.5 px-1 pb-1">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-lg border border-zGray-800/80 bg-zGray-900/60 px-2.5 py-1.5"
            title={item.text}
          >
            <Clock3 className="h-3.5 w-3.5 flex-shrink-0 text-tertiary" strokeWidth={2} />
            <span className="flex-shrink-0 text-[11px] tabular-nums text-tertiary">
              {index + 1}
            </span>
            <span className="flex-shrink-0 text-[12.5px] font-medium text-main">
              {item.senderName}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-secondary">
              {item.text}
            </span>
            <span className="flex-shrink-0 text-[11px] text-tertiary">
              {t('Runs after the turn ahead')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

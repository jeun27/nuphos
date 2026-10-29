import { useEffect, useRef, useState } from 'react'

import { api } from '../../../api'
import { parseAtlasError } from '../../../api/errors'

import { GUEST_POLL_MS } from './guestModel'

import type { AgentGuestConversation } from '../../../api/agent-types'

type Loaded = { sessionId: string; data: AgentGuestConversation | null }

/**
 * A chat the viewer may see as a guest: `undefined` while it loads, `null`
 * when they are not a guest of it. With `poll` it asks again every few
 * seconds while the window is visible; a failed poll keeps what is shown.
 */
export function useGuestConversation(
  sessionId: string,
  options: {
    poll: boolean
    initial?: AgentGuestConversation
    /** The viewer is no longer a guest of `sessionId`, or never was. */
    onMissing?: (sessionId: string) => void
  },
): AgentGuestConversation | null | undefined {
  const { poll, initial, onMissing } = options
  const [loaded, setLoaded] = useState<Loaded | null>(
    initial ? { sessionId: initial.conversation.sessionId, data: initial } : null,
  )
  // The seed stands in for the first load only; coming back to that chat later asks again.
  const seeded = useRef(initial?.conversation.sessionId)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | undefined
    const load = () =>
      api
        .agentGuestConversation(sessionId)
        .then((data) => {
          if (!cancelled) setLoaded({ sessionId, data })
        })
        .catch((err: unknown) => {
          if (cancelled) return
          const gone = parseAtlasError(err).code === 'not_found'

          setLoaded((current) =>
            current?.sessionId === sessionId && current.data && !gone
              ? current
              : { sessionId, data: null },
          )
          if (gone) onMissing?.(sessionId)
        })
    const start = () => {
      if (timer || document.visibilityState !== 'visible') return
      timer = setInterval(() => void load(), GUEST_POLL_MS)
    }
    const stop = () => {
      clearInterval(timer)
      timer = undefined
    }
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return stop()
      void load()
      start()
    }

    if (seeded.current !== sessionId) void load()
    seeded.current = undefined
    if (poll) {
      start()
      document.addEventListener('visibilitychange', onVisibility)
    }

    return () => {
      cancelled = true
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [onMissing, poll, sessionId])

  return loaded?.sessionId === sessionId ? loaded.data : undefined
}

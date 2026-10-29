import { useEffect, useState } from 'react'

import { api } from '../../../api'

import type { RuntimeControl } from './RuntimeSelector'
import type { ShareApprovalStatus } from '../../../api/device-types'

const POLL_MS = 5_000

/**
 * Whether this conversation waits for the owner of the teammate's computer it
 * runs on, or was declined there. Asked only while its agent is on a computer
 * shared at "Ask me first"; nothing to show otherwise.
 */
export function useShareApprovalWait(
  control: RuntimeControl | undefined,
  sessionId: string | undefined,
): 'pending' | 'denied' | null {
  const selected = control?.options?.find((instance) => instance.id === control.value?.id)
  const asks = selected?.local?.shared?.level === 'approve'
  const status = useShareApprovalStatus(asks ? sessionId : undefined)

  return status === 'pending' || status === 'denied' ? status : null
}

/** This person's own answer from the computer's owner for this conversation, polled until approved. */
export function useShareApprovalStatus(sessionId: string | undefined): ShareApprovalStatus | null {
  const [answer, setAnswer] = useState<{ sessionId: string; status: ShareApprovalStatus } | null>(
    null,
  )

  useEffect(() => {
    if (!sessionId) return
    let live = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = () =>
      void api.localShareStatus(sessionId).then(
        (status) => {
          if (!live) return
          setAnswer({ sessionId, status })
          // Approved is final for this conversation: nothing more to watch.
          if (status !== 'approved') timer = setTimeout(load, POLL_MS)
        },
        () => {
          if (live) timer = setTimeout(load, POLL_MS)
        },
      )

    load()

    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [sessionId])

  return sessionId && answer?.sessionId === sessionId ? answer.status : null
}

import { useCallback, useEffect, useState } from 'react'

import { api } from '../../api'
import { t } from '../../i18n'
import { toast } from '../ui/toast'

import { TIMELINE_CHANGED_EVENT } from './panel/timelineEvents'
import { publishRoomAccess } from './room/useRoom'

import type { ConversationAccessState } from '../../api/agent-types'

const NO_ACCESS: ConversationAccessState = { generalAccess: 'none', participants: [], guests: [] }

/**
 * Who may open a session, as the Share card shows it. Every access call answers
 * with the whole state, so `apply` replaces it and the room reads the same.
 */
export function useShareAccess(sessionId: string, teamId: string) {
  const [access, setAccess] = useState<ConversationAccessState>(NO_ACCESS)
  const apply = useCallback(
    (result: ConversationAccessState) => {
      setAccess(result)
      publishRoomAccess(sessionId, result)
    },
    [sessionId],
  )

  // The pane keys this by sessionId, so a switch remounts it with no stale list. An invite
  // from elsewhere (the composer's @mention prompt) announces itself; the header reloads then.
  useEffect(() => {
    let cancelled = false
    const load = () =>
      api
        .agentGetConversationParticipants(sessionId, teamId)
        .then((result) => {
          if (!cancelled) apply(result)
        })
        .catch((err: unknown) => toast.apiError(t('Failed to load agent participants'), err))
    const reloadIfThisSession = (event: Event) => {
      if ((event as CustomEvent<string>).detail === sessionId) void load()
    }

    void load()
    window.addEventListener(TIMELINE_CHANGED_EVENT, reloadIfThisSession)

    return () => {
      cancelled = true
      window.removeEventListener(TIMELINE_CHANGED_EVENT, reloadIfThisSession)
    }
  }, [apply, sessionId, teamId])

  return { ...access, guests: access.guests ?? [], apply }
}

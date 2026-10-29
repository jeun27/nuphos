import { useCallback, useEffect, useState } from 'react'

import { api } from '../../api'
import { t } from '../../i18n'
import { toast } from '../ui/toast'

import { TIMELINE_CHANGED_EVENT, announceTimelineChange } from './panel/timelineEvents'
import { publishRoomPeople } from './room/useRoom'

import type {
  AgentConversationParticipant,
  ConversationAccessState,
  GeneralAccess,
  ParticipantRole,
} from '../../api/agent-types'

/**
 * Who may open a chat, and the calls that change it. Every access call answers
 * with the whole state, so nothing here merges; `pending` names the call in flight:
 * 'invite', 'undo', 'access', or the id of the participant being changed.
 */
export function useShareAccess(sessionId: string, teamId: string) {
  const [participants, setParticipants] = useState<AgentConversationParticipant[]>([])
  const [generalAccess, setGeneralAccess] = useState<GeneralAccess>('none')
  const [pending, setPending] = useState<string | null>(null)

  const apply = useCallback(
    (result: ConversationAccessState) => {
      setParticipants(result.participants)
      setGeneralAccess(result.generalAccess)
      publishRoomPeople(sessionId, result.participants)
    },
    [sessionId],
  )

  // The pane keys the card by sessionId, so a switch remounts it with no stale list. An invite
  // from elsewhere (the composer's @mention prompt) announces itself; the list reloads then.
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

  /** Runs one access call with `key` pending; resolves whether it succeeded. */
  const run = (key: string, call: () => Promise<unknown>, failed: string) => {
    setPending(key)

    return call()
      .then(() => true)
      .catch((err: unknown) => {
        toast.apiError(failed, err)

        return false
      })
      .finally(() => setPending(null))
  }

  const removeIds = async (ids: string[]) => {
    for (const id of ids) apply(await api.agentRemoveConversationParticipant(sessionId, teamId, id))
    announceTimelineChange(sessionId)
  }

  const add = (ids: string[], role: ParticipantRole) =>
    run(
      'invite',
      async () => {
        apply(await api.agentInviteConversationParticipants(sessionId, teamId, ids, role))
        announceTimelineChange(sessionId)
      },
      t('Failed to add teammates'),
    )

  const remove = ({ id, name }: AgentConversationParticipant) =>
    void run(id, () => removeIds([id]), t('Failed to remove {name}', { name }))

  const changeRole = ({ id, name }: AgentConversationParticipant, role: ParticipantRole) =>
    void run(
      id,
      async () => apply(await api.agentSetConversationParticipantRole(sessionId, teamId, id, role)),
      t('Failed to change {name}', { name }),
    )

  const changeGeneralAccess = (value: GeneralAccess) =>
    void run(
      'access',
      async () => apply(await api.agentSetConversationGeneralAccess(sessionId, teamId, value)),
      t('Failed to change general access'),
    )

  const undo = (ids: string[]) => run('undo', () => removeIds(ids), t('Failed to undo'))

  return {
    participants,
    generalAccess,
    pending,
    add,
    remove,
    changeRole,
    changeGeneralAccess,
    undo,
  }
}

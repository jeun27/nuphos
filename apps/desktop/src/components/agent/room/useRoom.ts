import { useCallback, useEffect, useMemo, useState } from 'react'

import { api } from '../../../api'
import { t } from '../../../i18n'
import { useSwrCache } from '../../../lib/swrCache'
import { agentSessionsCacheKey } from '../../sidebar/state'
import { toast } from '../../ui/toast'
import { TIMELINE_CHANGED_EVENT, announceTimelineChange } from '../panel/timelineEvents'

import { roomAgents } from './roomModel'

import type { RoomAgent } from './roomModel'
import type {
  AgentConversation,
  AgentConversationParticipant,
  GroupAgent,
} from '../../../api/agent-types'

export type Room = {
  groupId: string
  teamId: string
  people: AgentConversationParticipant[]
  agents: RoomAgent[]
  /** The viewer's conversations, as the sidebar last listed them. */
  listed: AgentConversation[]
  viewerOwnsGroup: boolean
  setAgents: (agents: GroupAgent[]) => void
  reloadPeople: () => void
}

/**
 * A group's people (its participants) and agents (its agent sessions). The
 * agents reload when the tab's catch-up sees the group's list change.
 */
export function useRoom(
  groupId: string,
  teamId: string,
  agentSessionIds: readonly string[] | undefined,
  viewerOwnsGroup: boolean,
): Room {
  const [people, setPeople] = useState<AgentConversationParticipant[]>([])
  const [agents, setAgents] = useState<GroupAgent[]>([])
  const listed = useSwrCache<AgentConversation[]>(agentSessionsCacheKey(teamId))
  const agentKey = (agentSessionIds ?? []).join(',')

  const reloadPeople = useCallback(() => {
    api
      .agentGetConversationParticipants(groupId, teamId)
      .then((state) => setPeople(state.participants))
      .catch((err: unknown) => toast.apiError(t('Failed to load agent participants'), err))
  }, [groupId, teamId])

  useEffect(() => {
    reloadPeople()
    const reloadIfThisGroup = (event: Event) => {
      if ((event as CustomEvent<string>).detail === groupId) reloadPeople()
    }

    window.addEventListener(TIMELINE_CHANGED_EVENT, reloadIfThisGroup)

    return () => window.removeEventListener(TIMELINE_CHANGED_EVENT, reloadIfThisGroup)
  }, [groupId, reloadPeople])

  useEffect(() => {
    let cancelled = false

    api
      .agentListGroupAgents(groupId, teamId)
      .then((result) => {
        if (!cancelled) setAgents(result.agents)
      })
      .catch((err: unknown) => toast.apiError(t('Could not load the group’s agents'), err))

    return () => {
      cancelled = true
    }
  }, [groupId, teamId, agentKey])

  const shownAgents = useMemo(() => roomAgents(agents, listed ?? []), [agents, listed])
  const updateAgents = useCallback(
    (next: GroupAgent[]) => {
      setAgents(next)
      announceTimelineChange(groupId)
    },
    [groupId],
  )

  return {
    groupId,
    teamId,
    people,
    agents: shownAgents,
    listed: listed ?? [],
    viewerOwnsGroup,
    setAgents: updateAgents,
    reloadPeople,
  }
}

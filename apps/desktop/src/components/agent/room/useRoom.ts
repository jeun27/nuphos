import { useMemo } from 'react'

import { useAgentRuntimeStates } from '../../../lib/agentRuntimeStates'
import { useOpenedConversation } from '../../../lib/openedConversation'
import { runtimeTurnActive } from '../../../lib/runtimeExecution'
import { useSwrCache, writeSwrCache } from '../../../lib/swrCache'
import { agentSessionsCacheKey } from '../../sidebar/state'

import { roomAgents, roomRootOf } from './roomModel'

import type { RoomAgent } from './roomModel'
import type { AgentConversation, AgentConversationParticipant } from '../../../api/agent-types'

const roomPeopleKey = (sessionId: string) => `room-people:${sessionId}`

/** The Share button loads who is here; the room reads the same list instead of asking again. */
export function publishRoomPeople(sessionId: string, people: AgentConversationParticipant[]) {
  writeSwrCache(roomPeopleKey(sessionId), people)
}

export type Room = {
  people: AgentConversationParticipant[]
  agents: RoomAgent[]
  /** The chat this room is open on: the manager, or one of its sub-agents. */
  here: string
}

/**
 * Who is in a chat's room, the tree it sits in from the top: its people, as Share last loaded them, and its agents,
 * from the chats the sidebar already polls. Nothing here asks the backend.
 */
export function useRoom(sessionId: string, teamId: string): Room {
  const people = useSwrCache<AgentConversationParticipant[]>(roomPeopleKey(sessionId))
  const listed = useSwrCache<AgentConversation[]>(agentSessionsCacheKey(teamId))
  const opened = useOpenedConversation(sessionId)
  const states = useAgentRuntimeStates()

  const agents = useMemo(() => {
    const conversations = listed ?? []
    const isWorking = (conversation: AgentConversation) =>
      runtimeTurnActive(states.get(conversation.sessionId)) || Boolean(conversation.activeRun)

    return roomAgents(roomRootOf(sessionId, conversations, opened), conversations, isWorking)
  }, [listed, opened, sessionId, states])

  return { people: people ?? [], agents, here: sessionId }
}

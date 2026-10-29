import { callJson, teamQuery } from './http'

import type { AgentGuestConversation, ConversationAccessState } from '../../src/api/agent-types'

function guestsPath(sessionId: string, teamId: string, guestKey?: string): string {
  const key = guestKey === undefined ? '' : `/${encodeURIComponent(guestKey)}`

  return `/agent/conversations/${encodeURIComponent(sessionId)}/guests${key}${teamQuery(teamId)}`
}

/** A chat the viewer was invited to as a guest; 404 when they are not one. */
export function getGuestConversation(sessionId: string): Promise<AgentGuestConversation> {
  const path = `/agent/guest/conversations/${encodeURIComponent(sessionId)}`

  return callJson('GET', path, undefined, 12_000)
}

export function inviteConversationGuest(
  sessionId: string,
  teamId: string,
  email: string,
): Promise<ConversationAccessState> {
  return callJson('POST', guestsPath(sessionId, teamId), { email }, 12_000)
}

/** `guestKey` is the guest's user id, or the email of an invite not taken up yet. */
export function removeConversationGuest(
  sessionId: string,
  teamId: string,
  guestKey: string,
): Promise<ConversationAccessState> {
  return callJson('DELETE', guestsPath(sessionId, teamId, guestKey), undefined, 12_000)
}

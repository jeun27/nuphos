import { callJsonForRenderer, teamQuery } from './http'

import type { GroupAgent } from '../../src/api/agent-types'

// A group is a conversation of people and agents; these are its own routes.
const agentsPath = (groupId: string, teamId: string) =>
  `/agent/conversations/${encodeURIComponent(groupId)}/agents${teamQuery(teamId)}`

export function createGroup(teamId: string, title: string): Promise<{ sessionId: string }> {
  return callJsonForRenderer('POST', `/agent/groups${teamQuery(teamId)}`, { title }, 12_000)
}

export function listGroupAgents(
  groupId: string,
  teamId: string,
): Promise<{ agents: GroupAgent[] }> {
  return callJsonForRenderer('GET', agentsPath(groupId, teamId), undefined, 12_000)
}

export function addGroupAgent(
  groupId: string,
  teamId: string,
  agentSessionId: string,
): Promise<{ agents: GroupAgent[] }> {
  return callJsonForRenderer(
    'POST',
    agentsPath(groupId, teamId),
    { sessionId: agentSessionId },
    12_000,
  )
}

export async function removeGroupAgent(
  groupId: string,
  teamId: string,
  agentSessionId: string,
): Promise<void> {
  const path = `/agent/conversations/${encodeURIComponent(groupId)}/agents/${encodeURIComponent(agentSessionId)}${teamQuery(teamId)}`

  await callJsonForRenderer('DELETE', path, undefined, 12_000)
}

/** `id` is the client's, so a resend is the same message. */
export function postGroupMessage(
  groupId: string,
  teamId: string,
  text: string,
  id: string,
): Promise<{ id: string }> {
  const path = `/agent/conversations/${encodeURIComponent(groupId)}/group-messages${teamQuery(teamId)}`

  return callJsonForRenderer('POST', path, { text, id }, 20_000)
}

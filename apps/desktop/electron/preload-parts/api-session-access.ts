import { ipcRenderer } from 'electron'

import type { GeneralAccess, ParticipantRole } from '../../src/api/agent-types'

export const sessionAccessApi = {
  agentGetSessionResources: (sessionId: string, teamId: string) =>
    ipcRenderer.invoke('agent:getSessionResources', sessionId, teamId),
  agentUnlinkSessionResource: (sessionId: string, teamId: string, resourceId: string) =>
    ipcRenderer.invoke('agent:unlinkSessionResource', sessionId, teamId, resourceId),
  agentGetConversationParticipants: (sessionId: string, teamId?: string) =>
    ipcRenderer.invoke('agent:getConversationParticipants', sessionId, teamId),
  agentInviteConversationParticipants: (
    sessionId: string,
    teamId: string,
    userIds: string[],
    role: ParticipantRole,
  ) => ipcRenderer.invoke('agent:inviteConversationParticipants', sessionId, teamId, userIds, role),
  agentSetConversationParticipantRole: (
    sessionId: string,
    teamId: string,
    userId: string,
    role: ParticipantRole,
  ) => ipcRenderer.invoke('agent:setConversationParticipantRole', sessionId, teamId, userId, role),
  agentSetConversationGeneralAccess: (
    sessionId: string,
    teamId: string,
    generalAccess: GeneralAccess,
  ) => ipcRenderer.invoke('agent:setConversationGeneralAccess', sessionId, teamId, generalAccess),
  agentSetConversationTeamSteer: (sessionId: string, teamId: string, enabled: boolean) =>
    ipcRenderer.invoke('agent:setConversationTeamSteer', sessionId, teamId, enabled),
  agentRemoveConversationParticipant: (sessionId: string, teamId: string, userId: string) =>
    ipcRenderer.invoke('agent:removeConversationParticipant', sessionId, teamId, userId),
  agentGuestConversation: (sessionId: string) =>
    ipcRenderer.invoke('agent:guestConversation', sessionId),
  agentInviteGuest: (sessionId: string, teamId: string, email: string) =>
    ipcRenderer.invoke('agent:inviteGuest', sessionId, teamId, email),
  agentRemoveGuest: (sessionId: string, teamId: string, guestKey: string) =>
    ipcRenderer.invoke('agent:removeGuest', sessionId, teamId, guestKey),
}

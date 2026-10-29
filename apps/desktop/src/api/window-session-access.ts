import type {
  AgentGuestConversation,
  ConversationAccessState,
  GeneralAccess,
  ParticipantRole,
} from './agent-types.ts'
import type { SessionResourcesResponse } from './session-resource-types'

/** Who may open a session and what they may do there. */
export type WindowSessionAccessApi = {
  agentGetSessionResources(sessionId: string, teamId: string): Promise<SessionResourcesResponse>
  /** Writes a secret to a file on the session's runtime; only the path comes back. */
  agentSaveSecret(
    sessionId: string,
    name: string,
    value: string,
    teamId?: string,
  ): Promise<{ ok: boolean; path: string }>
  agentUnlinkSessionResource(
    sessionId: string,
    teamId: string,
    resourceId: string,
  ): Promise<{ ok: boolean }>
  agentGetConversationParticipants(
    sessionId: string,
    teamId?: string,
  ): Promise<ConversationAccessState>
  agentInviteConversationParticipants(
    sessionId: string,
    teamId: string,
    userIds: string[],
    role: ParticipantRole,
  ): Promise<ConversationAccessState>
  agentRemoveConversationParticipant(
    sessionId: string,
    teamId: string,
    userId: string,
  ): Promise<ConversationAccessState>
  agentSetConversationParticipantRole(
    sessionId: string,
    teamId: string,
    userId: string,
    role: ParticipantRole,
  ): Promise<ConversationAccessState>
  agentSetConversationGeneralAccess(
    sessionId: string,
    teamId: string,
    generalAccess: GeneralAccess,
  ): Promise<ConversationAccessState>
  agentSetConversationTeamSteer(
    sessionId: string,
    teamId: string,
    enabled: boolean,
  ): Promise<{ teamSteer: boolean }>
  /** Rejects with not_found unless the viewer is a guest of this chat. */
  agentGuestConversation(sessionId: string): Promise<AgentGuestConversation>
  agentInviteGuest(
    sessionId: string,
    teamId: string,
    email: string,
  ): Promise<ConversationAccessState>
  /** `guestKey` is the guest's user id, or the email of an invite not taken up yet. */
  agentRemoveGuest(
    sessionId: string,
    teamId: string,
    guestKey: string,
  ): Promise<ConversationAccessState>
  agentSetConversationAvatar(
    sessionId: string,
    avatar: string | null,
    teamId?: string,
  ): Promise<{ avatar: string | null }>
}

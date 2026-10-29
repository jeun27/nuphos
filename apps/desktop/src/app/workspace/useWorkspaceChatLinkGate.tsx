import { useCallback, useEffect, useState } from 'react'

import { chatLinkBlocked } from './chatLinkGate'

import type { WorkspaceActiveTabResult } from './useWorkspaceActiveTab'
import type { WorkspaceInvitationsResult } from './useWorkspaceInvitations'
import type { WorkspaceShellStateResult } from './useWorkspaceShellState'
import type { WorkspaceTabSyncResult } from './useWorkspaceTabSync'
import type { WorkspaceTakeoverResult } from './useWorkspaceTakeover'
import type { WorkspaceTeamsResult } from './useWorkspaceTeams'
import type { WorkspaceTeamsSyncResult } from './useWorkspaceTeamsSync'
import type { WorkspaceProps } from './workspaceProps'

type Args = WorkspaceProps &
  WorkspaceShellStateResult &
  WorkspaceActiveTabResult &
  WorkspaceTabSyncResult &
  WorkspaceTeamsResult &
  WorkspaceTeamsSyncResult &
  WorkspaceInvitationsResult &
  WorkspaceTakeoverResult

/** A chat link the account could not open: the chat and the team it lives in. */
export type ChatLinkGate = { teamId: string; sessionId: string }

// The screen belongs to the chat pane it opened over; moving to any chat, or a new one, leaves it.
const surfaceKey = (sessionId: string | null, newChatRequest: number) =>
  `${sessionId ?? ''}:${String(newChatRequest)}`

/**
 * A link to a chat in a team this account is not in keeps the workspace where
 * it is and shows why, with the invitation to accept when there is one. An
 * accepted invitation's chat opens once the joined team is in the list.
 */
export function useWorkspaceChatLinkGate(a: Args) {
  const {
    teams,
    teamsLoaded,
    pendingInvitations,
    acceptInvitation,
    refreshInvitationsSilently,
    workspaceActions,
    workspaceStore,
    selectedSessionId,
    newChatRequest,
    invitationTakeoverOpen,
    onboardingActive,
    chatToOpen,
    setChatToOpen,
  } = a
  const [gate, setGate] = useState<(ChatLinkGate & { surface: string }) | null>(null)
  const chatLinkGate = gate?.surface === surfaceKey(selectedSessionId, newChatRequest) ? gate : null

  useEffect(() => {
    if (!chatToOpen || invitationTakeoverOpen || onboardingActive) return
    if (!teams.some((team) => team.id === chatToOpen.teamId)) return
    setChatToOpen(null)
    workspaceActions.selectSession(chatToOpen.sessionId, { teamId: chatToOpen.teamId })
  }, [chatToOpen, invitationTakeoverOpen, onboardingActive, setChatToOpen, teams, workspaceActions])

  const guardChatLink = useCallback(
    (sessionId: string, teamId: string | undefined): boolean => {
      if (!chatLinkBlocked(teamsLoaded ? teams : null, teamId)) return false
      const before = workspaceStore.getState()

      // The screen takes the chat pane, so a management page on screen gives way to it.
      if (before.mainPageOpen) {
        workspaceActions.selectSession(before.sessionId, { readOnly: before.sessionReadOnly })
      }
      const state = workspaceStore.getState()

      setGate({ teamId, sessionId, surface: surfaceKey(state.sessionId, state.newChatRequest) })
      // An invitation sent a moment ago should be on the screen too.
      refreshInvitationsSilently()

      return true
    },
    [refreshInvitationsSilently, teams, teamsLoaded, workspaceActions, workspaceStore],
  )

  const chatLinkInvitation = chatLinkGate
    ? (pendingInvitations.find((invitation) => invitation.teamId === chatLinkGate.teamId) ?? null)
    : null

  const acceptChatLinkInvitation = useCallback(async () => {
    if (!chatLinkGate || !chatLinkInvitation) return
    const teamId = await acceptInvitation(chatLinkInvitation.id)

    setChatToOpen({ teamId, sessionId: chatLinkGate.sessionId })
  }, [acceptInvitation, chatLinkGate, chatLinkInvitation, setChatToOpen])

  const dismissChatLinkGate = useCallback(() => setGate(null), [])

  return {
    chatLinkGate,
    chatLinkInvitation,
    guardChatLink,
    acceptChatLinkInvitation,
    dismissChatLinkGate,
  }
}

export type WorkspaceChatLinkGateResult = ReturnType<typeof useWorkspaceChatLinkGate>

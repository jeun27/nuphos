import { stampConversationAgentRuntime, stampConversationRuntimeInstance } from '@/lib/agent/db'
import { isLocalRuntimeId, parseLocalRuntimeId } from '@/lib/agent/devices/local-runtime/address'
import { roomTeamSteer } from '@/lib/agent/db/team-steer'
import { isUnattendedSource } from '@/lib/agent/devices/local-share'
import { AppError } from '@/lib/errors'
import { getTeamAgentRuntime } from '@/lib/identity'

import { resolveLocalRuntimeEndpoint } from './local-runtime-catalog'
import { developmentRuntimeEndpoint, requireRuntimeInstance } from './runtime-catalog'
import { runtimeLabel as providerLabel } from './runtime-provider'
import { listTeamRuntimes, resolveTeamRuntimeEndpoints } from './runtime-registry'
import {
  assertClaudeCodeSetupConfigured,
  resolveConversationAgentRuntime,
  resolveConversationRuntimeId,
  selectClaudeCodeChatEndpoint,
} from './runtime-routing'

import type { OpenAbProvider } from './runtime-provider'
import type { ConversationAgentRuntime } from './runtime-routing'
import type { TeamRuntimeEndpoint } from './team-openab-runtime'
import type { AgentConversation } from '@/lib/agent/db'
import type { SharedLocalRuntimeUse } from '@/lib/agent/devices/local-share-types'

export type ConversationChatRuntime = {
  runtime: ConversationAgentRuntime
  runtimeId?: string
  runtimeLabel?: string
  endpoint: TeamRuntimeEndpoint
}

export type ConversationChatRequest = {
  /** Who acts this turn; defaults to the conversation's owner. */
  userId?: string
  runtime?: OpenAbProvider
  runtimeId?: string
  purpose?: 'transport' | 'control'
  /** The conversation this turn is for, even before it is stored; a shared computer asks about it. */
  sessionId?: string
  /** Where this turn comes from (a channel or trigger), which may differ from where the conversation began. */
  source?: string
}

/**
 * The conversation a shared computer asks about, and where this turn comes from.
 * A brand-new chat has no stored conversation yet, and a channel or trigger
 * turn counts even when the conversation began in the app.
 */
export function sharedRuntimeUse(
  conversation: { sessionId?: string; metadata?: { source?: string } } | null | undefined,
  request: Pick<ConversationChatRequest, 'sessionId' | 'source'>,
): SharedLocalRuntimeUse {
  return {
    sessionId: conversation?.sessionId ?? request.sessionId,
    source: isUnattendedSource(request.source)
      ? request.source
      : (conversation?.metadata?.source ?? request.source),
  }
}

// A Box, or a computer that is not the conversation owner's, is never steered.
const boxOwnerOnly = () =>
  new AppError(
    403,
    'local_runtime_owner_only',
    'This conversation runs on its owner’s own machine, so only they can send messages here. Ask them to move it to a team agent to continue together.',
  )
const localRuntimeOwner = (runtimeId: string | undefined) =>
  runtimeId ? parseLocalRuntimeId(runtimeId)?.userId : undefined

/** Resolve every conversation onto the supported OpenAB runtime and placement. */
export async function resolveConversationChatRuntime(
  teamId: string | undefined,
  conversation:
    | (Pick<
        AgentConversation,
        'sessionId' | 'userId' | 'agentRuntime' | 'claudeCodePreview' | 'runtimeId'
      > &
        Partial<Pick<AgentConversation, 'metadata'>>)
    | null,
  request: ConversationChatRequest = {},
): Promise<ConversationChatRuntime> {
  const { runtime: requestedRuntime, purpose = 'transport' } = request
  const pinned = Boolean(conversation?.agentRuntime || conversation?.claudeCodePreview)
  const selectedId = resolveConversationRuntimeId(conversation, request.runtimeId)
  const actor = request.userId ?? conversation?.userId

  // A teammate steering the owner's chat on the owner's own computer: the
  // computer is looked up as the owner's, and the turn passes the room's share.
  // Anyone else's conversation on that computer stays the owner's alone.
  const onLocal = Boolean(
    conversation && actor !== conversation.userId && isLocalRuntimeId(conversation.runtimeId),
  )
  const room =
    conversation && onLocal && localRuntimeOwner(conversation.runtimeId) === conversation.userId
      ? { ownerId: conversation.userId, teamSteer: await roomTeamSteer(conversation) }
      : undefined

  if (onLocal && !room) throw boxOwnerOnly()
  const localAgentUser = conversation && conversation.userId !== actor ? undefined : actor

  if (selectedId && !teamId)
    throw new AppError(400, 'invalid_request', 'An agent requires a workspace')
  const instance =
    selectedId && teamId
      ? await requireRuntimeInstance(teamId, selectedId, room?.ownerId ?? localAgentUser, {
          shared: true,
        })
      : undefined

  if (room && instance?.local?.box) throw boxOwnerOnly()

  if (instance?.status === 'disabled')
    throw new AppError(
      409,
      'runtime_disabled',
      'This conversation’s agent is disabled. Enable it in Settings → Agent, or start a new conversation with another agent.',
    )
  const needsTeamDefault = !instance && !requestedRuntime && !pinned
  const teamDefault = needsTeamDefault && teamId ? await getTeamAgentRuntime(teamId) : 'claude-code'
  const runtime =
    instance?.provider ??
    resolveConversationAgentRuntime(conversation, teamDefault, requestedRuntime)

  if (conversation && !conversation.agentRuntime) {
    await stampConversationAgentRuntime(conversation.sessionId, runtime)
  }
  if (!teamId) throw new Error('OpenAB conversation is missing its Team scope.')
  if (instance?.kind === 'local' && (localAgentUser ?? room)) {
    // A teammate's computer shared with this person runs only its conversation's own calls.
    const endpoint = await resolveLocalRuntimeEndpoint(
      teamId,
      instance.id,
      localAgentUser ?? actor ?? '',
      purpose,
      undefined,
      { ...sharedRuntimeUse(conversation, request), ...(room ? { room } : {}) },
    )

    if (conversation && !conversation.runtimeId)
      await stampConversationRuntimeInstance(conversation.sessionId, instance.id, instance.label)

    return { runtime, endpoint, runtimeId: instance.id, runtimeLabel: instance.label }
  }
  const developmentEndpoint = developmentRuntimeEndpoint(runtime, purpose)

  if (
    developmentEndpoint &&
    (selectedId
      ? selectedId === developmentEndpoint.runtimeId
      : !conversation?.claudeCodePreview ||
        conversation.claudeCodePreview.runtimeUrl === developmentEndpoint.url)
  ) {
    const runtimeId = developmentEndpoint.runtimeId
    const runtimeLabel = instance?.label ?? `${providerLabel(runtime)} (local development)`
    const endpoint = selectClaudeCodeChatEndpoint(
      runtime,
      [developmentEndpoint],
      conversation?.claudeCodePreview?.runtimeUrl,
      runtimeId,
    )

    if (conversation && !conversation.runtimeId) {
      await stampConversationRuntimeInstance(conversation.sessionId, runtimeId, runtimeLabel)
    }

    return {
      runtime,
      endpoint,
      runtimeId,
      runtimeLabel,
    }
  }
  const registered = await resolveTeamRuntimeEndpoints(teamId, undefined, runtime, purpose)
  const endpoints = selectedId
    ? registered.filter((endpoint) => endpoint.runtimeId === selectedId)
    : registered

  if (endpoints.length === 0 && !selectedId)
    assertClaudeCodeSetupConfigured((await listTeamRuntimes(teamId, runtime)).length > 0, runtime)
  const endpoint = selectClaudeCodeChatEndpoint(
    runtime,
    endpoints,
    conversation?.claudeCodePreview?.runtimeUrl,
    selectedId,
  )

  const runtimeId = selectedId ?? endpoint?.runtimeId
  const runtimeLabel =
    instance?.label ??
    (runtimeId ? (await requireRuntimeInstance(teamId, runtimeId)).label : undefined)

  if (conversation && !conversation.runtimeId && runtimeId) {
    await stampConversationRuntimeInstance(conversation.sessionId, runtimeId, runtimeLabel)
  }

  return { runtime, endpoint, runtimeId, runtimeLabel }
}

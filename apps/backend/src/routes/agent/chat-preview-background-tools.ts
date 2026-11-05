import { updateBackgroundToolResult } from '@/lib/agent/db/transcript-background-tool'
import { setClaudeCodeBackgroundToolHandler } from '@/lib/claude-code-preview/autonomous-session-observer'

import type { ClaudeCodeAutonomousContext } from '@/lib/claude-code-preview/autonomous-session-observer'
import type { PreviewAgentUpdate } from '@/lib/claude-code-preview/preview-agent-update'

/** Writes a runtime's late result onto the card of the turn that started the call. */
export async function persistLateToolResult(
  context: ClaudeCodeAutonomousContext,
  update: Extract<PreviewAgentUpdate, { kind: 'tool' }>,
): Promise<void> {
  if (update.status !== 'completed' && update.status !== 'failed') return
  await updateBackgroundToolResult({
    sessionId: context.conversationId,
    userId: context.conversationOwnerUserId,
    teamId: context.teamId,
    toolCallId: update.toolCallId,
    state: update.status === 'failed' ? 'output-error' : 'output-available',
    ...(update.status === 'failed'
      ? {
          errorText:
            update.contentText ??
            (typeof update.rawOutput === 'string' ? update.rawOutput : 'Background command failed'),
        }
      : {}),
  })
}

export function registerBackgroundToolPersistence(): void {
  setClaudeCodeBackgroundToolHandler(persistLateToolResult)
}

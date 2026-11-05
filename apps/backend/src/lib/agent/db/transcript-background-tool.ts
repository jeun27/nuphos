import { agentConversations, agentMessages, withTeamScope } from './shared'
import { withTranscriptWriteLock } from './transcript-write-lock'

/** A late runtime result changes content, never the conversation execution state. */
export async function updateBackgroundToolResult(args: {
  sessionId: string
  userId: string
  teamId: string
  toolCallId: string
  state: 'output-available' | 'output-error'
  errorText?: string
}): Promise<void> {
  await withTranscriptWriteLock(args.sessionId, args.userId, async () => {
    const scope = withTeamScope({ sessionId: args.sessionId, userId: args.userId }, args.teamId)

    if (!(await agentConversations().findOne(scope, { projection: { _id: 1 } }))) return
    const fields: Record<string, unknown> = {
      'parts.$[tool].state': args.state,
      'parts.$[tool].completedAt': Date.now(),
      'parts.$[tool].runtimeResult': true,
      ...(args.errorText === undefined ? {} : { 'parts.$[tool].errorText': args.errorText }),
    }
    // A success clears an error the card was given while its result was
    // outstanding, such as a dropped runtime connection.
    const cleared =
      args.state === 'output-available' ? { 'parts.$[tool].errorText': '' as const } : null
    const result = await agentMessages().updateMany(
      { sessionId: args.sessionId, userId: args.userId, 'parts.toolCallId': args.toolCallId },
      { $set: fields, ...(cleared ? { $unset: cleared } : {}) },
      { arrayFilters: [{ 'tool.toolCallId': args.toolCallId }] },
    )

    if (result.modifiedCount > 0) {
      await agentConversations().updateOne(scope, { $set: { transcriptUpdatedAt: new Date() } })
    }
  })
}

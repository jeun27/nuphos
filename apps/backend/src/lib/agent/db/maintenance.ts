import { purgeConversationAttribution } from '@/lib/agent/memory-slots/attribution-store'
import { purgeConversationPreviewMemoryActivity } from '@/lib/agent/memory-slots/preview-activity-store'
import { logError } from '@/lib/observability'

import { purgeConversationTraces } from '../trace-store/store'

import { PRIVATE_GRANT, narrowToParent } from './access-tree'
import { syncDescendantAccess } from './access-tree-sync'
import { agentConversations, agentMessages, withTeamScope } from './shared'

// Refuses to blank a title. The conversation already carries a usable one from
// insert (`fallbackTitle`); overwriting it with '' leaves every reader falling
// back to the raw first message.
export async function updateConversationTitle(
  sessionId: string,
  userId: string,
  title: string,
): Promise<boolean> {
  const next = title.trim()

  if (!next) return false
  const result = await agentConversations().updateOne(
    { sessionId, userId, titleManuallySet: { $ne: true } },
    { $set: { title: next } },
  )

  return result.matchedCount > 0
}

// A manual title wins over an already-running background title generator.
export async function renameConversation(
  sessionId: string,
  userId: string,
  teamId: string | undefined,
  title: string,
): Promise<boolean> {
  const next = title.trim()

  if (!next || next.length > 120) return false
  const result = await agentConversations().updateOne(
    withTeamScope({ sessionId, userId }, teamId),
    { $set: { title: next, titleManuallySet: true } },
  )

  return result.matchedCount > 0
}

// The character a person picked for this Agent; null goes back to the one its
// ID selects. Clients own the catalog and ignore a name they do not know.
export async function setConversationAvatar(
  sessionId: string,
  avatar: string | null,
): Promise<boolean> {
  const result = await agentConversations().updateOne(
    { sessionId },
    avatar === null ? { $unset: { avatar: '' } } : { $set: { avatar } },
  )

  return result.matchedCount > 0
}

const treeScope = (conversation: { userId: string; teamId?: string }) => ({
  userId: conversation.userId,
  ...(conversation.teamId ? { teamId: conversation.teamId } : {}),
})

// Nests a conversation under another one, or stops nesting it when
// `parentSessionId` is null.
export async function setConversationParent(
  sessionId: string,
  userId: string,
  teamId: string | undefined,
  parentSessionId: string | null,
): Promise<'ok' | 'not_found' | 'invalid_parent'> {
  const filter = withTeamScope({ sessionId, userId }, teamId)

  if (parentSessionId === null) {
    // A thread an agent opened only had its parent's sharing; on its own it is
    // private again, and so is whatever below it still follows it.
    const unlinked = await agentConversations().findOneAndUpdate(
      filter,
      { $unset: { parentSessionId: '' } },
      { returnDocument: 'after' },
    )

    if (!unlinked) return 'not_found'
    if (!unlinked.ownAccess) {
      await agentConversations().updateOne(filter, { $set: PRIVATE_GRANT })
      await syncDescendantAccess(sessionId, treeScope(unlinked))
    }

    return 'ok'
  }
  const conversation = await agentConversations().findOne(filter)

  if (!conversation) return 'not_found'
  if (!(await isValidParent(sessionId, userId, conversation.teamId, parentSessionId))) {
    return 'invalid_parent'
  }
  const parent = await agentConversations().findOne(
    withTeamScope({ sessionId: parentSessionId, userId }, conversation.teamId),
  )

  if (!parent) return 'invalid_parent'
  // Nesting groups; it never widens. The thread keeps its own sharing, cut down
  // to the new parent's, and so does everything below it.
  const updated = await agentConversations().findOneAndUpdate(
    filter,
    { $set: { parentSessionId, ownAccess: true, ...narrowToParent(conversation, parent) } },
    { returnDocument: 'after' },
  )

  if (updated) await syncDescendantAccess(sessionId, treeScope(updated))

  return 'ok'
}

// The parent must be the same owner's conversation in the same team, and must
// not sit below this one: the sidebars drop every row of a loop.
async function isValidParent(
  sessionId: string,
  userId: string,
  teamId: string | undefined,
  parentSessionId: string,
): Promise<boolean> {
  const projection = { sessionId: 1, parentSessionId: 1, teamId: 1 }
  let next = await agentConversations().findOne(
    { sessionId: parentSessionId, userId },
    { projection },
  )

  if (!teamId || next?.teamId !== teamId) return false
  const seen = new Set([sessionId])

  while (next) {
    if (seen.has(next.sessionId)) return false
    seen.add(next.sessionId)
    next = next.parentSessionId
      ? await agentConversations().findOne({ sessionId: next.parentSessionId }, { projection })
      : null
  }

  return true
}

export async function getCompactionSummary(
  sessionId: string,
  userId: string,
): Promise<{ summary: string; messageCount: number } | null> {
  const doc = await agentConversations().findOne(
    { sessionId, userId },
    { projection: { compactionSummary: 1, compactionMessageCount: 1 } },
  )

  if (!doc?.compactionSummary || doc.compactionMessageCount == null) return null

  return { summary: doc.compactionSummary, messageCount: doc.compactionMessageCount }
}

export async function updateCompactionSummary(
  sessionId: string,
  userId: string,
  summary: string,
  messageCount: number,
): Promise<void> {
  await agentConversations().updateOne(
    {
      sessionId,
      userId,
      $or: [
        { compactionMessageCount: { $lt: messageCount } },
        { compactionMessageCount: { $exists: false } },
      ],
    },
    { $set: { compactionSummary: summary, compactionMessageCount: messageCount } },
  )
}

export async function deleteConversation(
  sessionId: string,
  userId: string,
  teamId?: string,
): Promise<boolean> {
  const result = await agentConversations().deleteOne(withTeamScope({ sessionId, userId }, teamId))

  if (result.deletedCount === 0) return false
  await agentMessages().deleteMany({ sessionId, userId })
  await purgeConversationTraces(sessionId).catch((err: unknown) => {
    logError('agent.trace.purge_failed', err, { sessionId })
  })
  // A6: measurement rows carry PII (userId/teamId/notes) and must die with
  // the conversation. Fail-open: the conversation is already gone, so a
  // transient purge error must not 5xx the delete (a retry would then 404);
  // analytics never blocks a user operation.
  await purgeConversationAttribution(sessionId).catch((err: unknown) => {
    logError('memory.attribution_purge_failed', err, { sessionId })
  })
  await purgeConversationPreviewMemoryActivity(sessionId).catch((err: unknown) => {
    logError('memory.preview_activity_purge_failed', err, { sessionId })
  })

  return true
}

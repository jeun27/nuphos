import { api } from '../../../api'
import { t } from '../../../i18n/index.ts'
import { toast } from '../../ui/toast'
import { optimisticSenderMetadata } from '../panel/optimisticSender'
import { uid } from '../panel/stall'

import type { PanelCtx } from '../panel/ctx'
import type { Message, Tab } from '../panel/model'

type GroupSendCtx = Pick<PanelCtx, 'setTabs' | 'teamId'> & {
  currentUser: Parameters<typeof optimisticSenderMetadata>[0]
}

/**
 * A message to a group is posted, not run: it shows at once, and agents that
 * choose to answer arrive with the transcript catch-up. A person posting
 * refills the agents' turns, so the paused line clears with it.
 */
export async function sendToGroup(
  { currentUser, setTabs, teamId }: GroupSendCtx,
  tab: Tab,
  text: string,
  filePaths: string[],
): Promise<void> {
  if (filePaths.length > 0) {
    toast.error(t('Files can’t be posted to a group yet'))

    return
  }
  if (!teamId || !text) return
  const createdAt = Date.now()
  const message: Message = {
    id: uid(),
    role: 'user',
    parts: [{ type: 'text', text }],
    createdAt,
    metadata: optimisticSenderMetadata(currentUser, createdAt),
  }
  const update = (change: (current: Tab) => Tab) =>
    setTabs((tabs) => tabs.map((each) => (each.sessionId === tab.sessionId ? change(each) : each)))

  update((current) => ({ ...current, messages: [...current.messages, message], agentTurns: 0 }))
  try {
    await api.agentPostGroupMessage(tab.sessionId, teamId, text, message.id)
  } catch (err) {
    update((current) => ({
      ...current,
      messages: current.messages.filter((each) => each.id !== message.id),
    }))
    toast.apiError(t('Could not post to the group'), err)
  }
}

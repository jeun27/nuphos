import { AgentAvatar } from '../AgentAvatar'
import { LoadingText } from '../panel/partChrome'

import { runningRequester } from './roomModel'

import type { Tab } from '../panel/model'

/**
 * "Builder is working for Mira · Thinking…": which agent holds the turn, and
 * whose request it is once more than one person has asked here.
 */
export function AgentWorkingRow({
  tab,
  label,
}: {
  tab: Pick<Tab, 'sessionId' | 'title' | 'agentRuntime' | 'messages'>
  label: string
}) {
  const requester = runningRequester(tab.messages)

  return (
    <span className="flex min-w-0 items-center gap-2">
      <AgentAvatar agentId={tab.sessionId} provider={tab.agentRuntime} size={20} animated />
      <span className="min-w-0 truncate text-secondary">
        <span className="font-medium text-main">{tab.title || 'Agent'}</span> is working
        {requester && <> for {requester.displayName}</>}
      </span>
      <span className="text-tertiary">·</span>
      <LoadingText>{label}</LoadingText>
    </span>
  )
}

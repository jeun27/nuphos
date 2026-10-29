import { Users } from 'lucide-react'

import { AgentAvatar } from '../agent/AgentAvatar'
import { isGroup } from '../agent/room/roomModel'

import type { Item } from './types'
import type { AgentConversation } from '../../api'

/** Agent identity and current Runtime; execution status lives in ChatRowStatus. */
export function chatRowIcon(conversation: AgentConversation): Pick<Item, 'icon' | 'iconNode'> {
  // A group is people and agents, not one agent.
  if (isGroup(conversation)) return { icon: Users }

  return {
    iconNode: (
      <AgentAvatar
        agentId={conversation.sessionId}
        avatar={conversation.avatar}
        provider={conversation.agentRuntime}
        sidebar
        animated
      />
    ),
  }
}

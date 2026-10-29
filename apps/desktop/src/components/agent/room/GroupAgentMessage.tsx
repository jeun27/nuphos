import { t } from '../../../i18n'
import { toAbsoluteAtlasUrl } from '../../../lib/webBaseUrl'
import { AgentAvatar } from '../AgentAvatar'
import { MessageResponse } from '../MessageResponse'
import { CopyMessageButton } from '../panel/messageActions'
import { formatMessageTimestamp } from '../panel/streamText'

import { AgentTag } from './AgentTag'
import { agentPostLink } from './roomModel'

import type { GroupMessages } from './groupMessages'
import type { AgentMessageMetadata } from '../../../api/agent-types'
import type { ReactNode } from 'react'

/** A message an agent posted to the group, shown as that agent speaking. */
export function GroupAgentMessage({
  metadata,
  text,
  createdAt,
  group,
  onOpenNuphosLink,
  renderLink,
}: {
  metadata: AgentMessageMetadata
  text: string
  createdAt?: number
  group: GroupMessages
  onOpenNuphosLink?: (href: string) => boolean
  renderLink?: (href: string, children: ReactNode) => ReactNode
}) {
  const name = metadata.sender.displayName
  const linked = agentPostLink(metadata, group.readable)
  const agentId = metadata.sourceSessionId ?? metadata.sender.id
  const sentAt = createdAt ?? Date.parse(metadata.sentAt)

  return (
    <div className="group/message flex items-start gap-2.5">
      <span className="mt-0.5">
        <AgentAvatar agentId={agentId} provider={metadata.sender.agentRuntime} size={28} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2 text-xs leading-4">
          {linked && onOpenNuphosLink ? (
            <button
              type="button"
              title={t('Open {name}', { name })}
              onClick={() =>
                onOpenNuphosLink(toAbsoluteAtlasUrl(`/teams/${group.teamId}/agent/${linked}`))
              }
              className="min-w-0 truncate font-medium text-secondary hover:underline"
            >
              {name}
            </button>
          ) : (
            <span className="min-w-0 truncate font-medium text-secondary">{name}</span>
          )}
          <AgentTag />
          {Number.isFinite(sentAt) && (
            <span className="shrink-0 text-[11px] text-tertiary tabular-nums">
              {formatMessageTimestamp(sentAt)}
            </span>
          )}
        </div>
        <div className="mt-1 text-[14px] break-words">
          <MessageResponse
            className="[&_p]:whitespace-pre-wrap [&_li]:whitespace-pre-wrap"
            renderLink={renderLink}
            onLinkClick={onOpenNuphosLink}
          >
            {text}
          </MessageResponse>
        </div>
        {text && (
          <div className="-ml-1 mt-0.5 flex min-h-7 items-center opacity-0 group-hover/message:opacity-100 group-focus-within/message:opacity-100">
            <CopyMessageButton text={text} label={t('Copy message')} />
          </div>
        )}
      </div>
    </div>
  )
}

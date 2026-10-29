import { Eye, Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'

import { t } from '../../../i18n'
import { Avatar } from '../../Avatar'
import { Button } from '../../ui/button'
import { toast } from '../../ui/toast'
import { AgentAvatar } from '../AgentAvatar'
import { NameTag } from '../room/GuestBadge'
import { firstName } from '../room/roomModel'

import { GuestRoomRow } from './GuestRoomRow'
import { GuestTranscript } from './GuestTranscript'
import { shownGuestChat } from './guestModel'
import { useGuestConversation } from './useGuestConversation'

import type { AgentGuestConversation } from '../../../api/agent-types'
import type { TeamInvitation } from '../../../types'

/** Where the composer would be: why there is none, or the invitation that adds one. */
function GuestFooter({
  owner,
  invitation,
  onAccept,
}: {
  owner: string
  invitation: TeamInvitation | null
  onAccept: () => Promise<void>
}) {
  const [accepting, setAccepting] = useState(false)
  const accept = () => {
    setAccepting(true)
    onAccept()
      .catch((err: unknown) => toast.apiError(t('Failed to accept the invitation'), err))
      .finally(() => setAccepting(false))
  }

  return (
    <div className="flex flex-shrink-0 items-center justify-center gap-2 border-t border-zGray-800/60 px-6 py-3 text-[12.5px] text-secondary">
      <Eye className="h-3.5 w-3.5 shrink-0 text-tertiary" strokeWidth={2} />
      {invitation
        ? t('You’re invited to {team}. Accept to take part here.', {
            team: invitation.team?.name ?? t('their team'),
          })
        : t('You’re viewing as a guest. Ask {owner} to add you to {team} to take part.', {
            owner,
            team: t('their team'),
          })}
      {invitation && (
        <Button size="sm" className="ml-1 h-7" disabled={accepting} onClick={accept}>
          {accepting && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
          {t('Accept invite')}
        </Button>
      )}
    </div>
  )
}

/**
 * A chat opened from a link by someone its owner invited as a guest. It takes
 * the whole chat pane: the chat, who shares it, and its agents to switch
 * between, all view only. Nothing of the team loads, and the workspace stays put.
 */
export function GuestChatView({
  linked,
  currentUserId,
  invitation,
  onAccept,
  onLost,
}: {
  /** The first answer for the linked chat; the view keeps it fresh from there. */
  linked: AgentGuestConversation
  currentUserId: string
  /** An invitation to the chat's team, once the owner asked them in as a member. */
  invitation: TeamInvitation | null
  onAccept: () => Promise<void>
  /** The guest lost access to the linked chat. */
  onLost: () => void
}) {
  const linkedId = linked.conversation.sessionId
  const [picked, setPicked] = useState<string | null>(null)
  // The last answer stays on screen while a newly picked chat loads.
  const [data, setData] = useState(linked)
  const shown = shownGuestChat(picked, data.tree, linkedId)
  // A sub-agent no longer shared falls back to the linked chat; losing that ends the view.
  const onMissing = useCallback(
    (sessionId: string) => (sessionId === linkedId ? onLost() : setPicked(null)),
    [linkedId, onLost],
  )
  const answer = useGuestConversation(shown, { poll: true, initial: linked, onMissing })

  if (answer && answer !== data) setData(answer)

  const { conversation } = data
  const owner = firstName(conversation.owner.name)

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-agentCanvas text-main">
      <div className="titlebar-drag flex h-[44px] flex-shrink-0 items-center gap-2 border-b border-zGray-800/60 px-3">
        <AgentAvatar agentId={conversation.sessionId} provider={conversation.agentRuntime} />
        <span className="min-w-0 truncate text-[13px] font-medium text-main">
          {conversation.title || t('Untitled agent')}
        </span>
        <NameTag title={t('You can read this chat and its sub-agents, but not send to them.')}>
          {t('Guest · view only')}
        </NameTag>
        <span className="flex-1" />
        <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-secondary">
          <Avatar
            src={conversation.owner.avatarURL}
            name={conversation.owner.name}
            size={18}
            className="!rounded-full"
          />
          {t('Shared by {name}', { name: owner })}
        </span>
      </div>
      <GuestRoomRow data={data} shown={shown} currentUserId={currentUserId} onShow={setPicked} />
      <GuestTranscript
        sessionId={conversation.sessionId}
        messages={data.messages}
        working={Boolean(conversation.activeRun)}
      />
      <GuestFooter owner={owner} invitation={invitation} onAccept={onAccept} />
    </div>
  )
}

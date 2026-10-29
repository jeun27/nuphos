import { useCallback, useState } from 'react'

import { GuestChatView } from '../../components/agent/guest/GuestChatView'
import { useGuestConversation } from '../../components/agent/guest/useGuestConversation'

import { ChatLinkGateScreen } from './ChatLinkGateScreen'

import type { ChatLinkGate } from './useWorkspaceChatLinkGate'
import type { TeamInvitation } from '../../types'

/**
 * A chat link into a team this account is not in. A guest of the chat reads
 * it right here; anyone else gets the screen that says why it is closed.
 */
export function ChatLinkGatePane({
  gate,
  currentUserId,
  invitation,
  onAccept,
  onDismiss,
}: {
  gate: ChatLinkGate
  currentUserId: string
  invitation: TeamInvitation | null
  onAccept: () => Promise<void>
  onDismiss: () => void
}) {
  const answer = useGuestConversation(gate.sessionId, { poll: false })
  const [lost, setLost] = useState(false)
  const onLost = useCallback(() => setLost(true), [])

  // Asking takes a moment; a blank pane beats the closed screen flashing first.
  if (answer === undefined) return <div className="absolute inset-0 z-20 bg-main" />
  if (answer && !lost) {
    return (
      <GuestChatView
        linked={answer}
        currentUserId={currentUserId}
        invitation={invitation}
        onAccept={onAccept}
        onLost={onLost}
      />
    )
  }

  return <ChatLinkGateScreen invitation={invitation} onAccept={onAccept} onDismiss={onDismiss} />
}

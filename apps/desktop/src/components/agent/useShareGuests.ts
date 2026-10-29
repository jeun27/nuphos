import { useState } from 'react'

import { api } from '../../api'
import { t } from '../../i18n'
import { toast } from '../ui/toast'

import { announceTimelineChange } from './panel/timelineEvents'
import { guestName } from './room/roomModel'

import type { GuestInviteContext } from './NewcomerInvites'
import type { ConversationAccessState, ConversationGuest } from '../../api/agent-types'

/**
 * The owner's guest calls for the Share card. Each answers with the whole
 * access state, which `apply` takes as it does for teammates.
 */
export function useShareGuests(
  sessionId: string,
  teamId: string,
  guests: ConversationGuest[],
  apply: (result: ConversationAccessState) => void,
) {
  // The key of the guest being removed.
  const [removing, setRemoving] = useState<string | null>(null)

  const invite: GuestInviteContext['onInvite'] = (email) =>
    api
      .agentInviteGuest(sessionId, teamId, email)
      .then((result) => {
        apply(result)
        announceTimelineChange(sessionId)
      })
      .catch((err: unknown) => {
        toast.apiError(t('Failed to invite {email}', { email }), err)
      })

  const remove = (guest: ConversationGuest) => {
    setRemoving(guest.key)
    api
      .agentRemoveGuest(sessionId, teamId, guest.key)
      .then((result) => {
        apply(result)
        announceTimelineChange(sessionId)
      })
      .catch((err: unknown) =>
        toast.apiError(t('Failed to remove {name}', { name: guestName(guest) }), err),
      )
      .finally(() => setRemoving(null))
  }

  return { invite: { guests, onInvite: invite }, remove, removing }
}

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { emailToInvite, pendingInvitesFor } from './pendingInvites.ts'

import type { TeamInvitation, TeamMember } from '../../../types'

const MEMBERS = [{ id: 'u-bryan', email: 'Bryan@example.com' }] as TeamMember[]

test('an email that matches nobody in the team is offered as an invite', () => {
  assert.equal(emailToInvite(' Shant@Example.com ', MEMBERS), 'shant@example.com')
  assert.equal(emailToInvite('bryan@example.com', MEMBERS), null)
  assert.equal(emailToInvite('shant', MEMBERS), null)
  assert.equal(emailToInvite('shant@example', MEMBERS), null)
  // Until the team has loaded, nobody can say the email is new.
  assert.equal(emailToInvite('shant@example.com', null), null)
})

const invite = (id: string, sessionId: string, extra: Partial<TeamInvitation> = {}) =>
  ({
    id,
    inviteeEmail: `${id}@example.com`,
    conversations: [{ sessionId, role: 'reply' }],
    ...extra,
  }) as TeamInvitation

test('only pending invitations carrying a chat in this room are listed', () => {
  const invitations = [
    invite('shant', 'chat-1'),
    invite('sub', 'sub-agent'),
    invite('other', 'chat-2'),
    invite('joined', 'chat-1', { acceptedAt: '2026-10-01' }),
    invite('declined', 'chat-1', { rejectedAt: '2026-10-01' }),
    { id: 'plain', inviteeEmail: 'plain@example.com' } as TeamInvitation,
  ]

  assert.deepEqual(
    pendingInvitesFor(invitations, ['chat-1', 'sub-agent']).map((entry) => entry.id),
    ['shant', 'sub'],
  )
})

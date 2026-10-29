import { describe, expect, test } from 'bun:test'

import { conversationAccess } from './access'
import { inheritedGrant, inviteExceedsParent, widerThanParent } from './access-tree'

const parent = {
  userId: 'owner',
  teamId: 'team',
  generalAccess: 'view' as const,
  participantIds: ['ann', 'bo'],
  viewOnlyIds: ['bo'],
  managerIds: ['ann'],
}

describe('inheritedGrant', () => {
  test('a sub-agent opens to exactly the people its parent does', () => {
    const child = { userId: 'owner', teamId: 'team', ...inheritedGrant(parent) }

    for (const viewer of ['owner', 'ann', 'bo', 'teammate', 'stranger']) {
      expect(conversationAccess(child, viewer)).toBe(conversationAccess(parent, viewer))
    }
  })

  test('a parent from before sharing existed passes on its team-wide reply', () => {
    expect(inheritedGrant({}).generalAccess).toBe('reply')
  })

  test('the copy does not alias the parent', () => {
    const grant = inheritedGrant(parent)

    grant.participantIds.push('carl')
    expect(parent.participantIds).toEqual(['ann', 'bo'])
  })
})

describe('widerThanParent', () => {
  test('a sub-agent may match or narrow its parent, never widen it', () => {
    expect(widerThanParent('none', parent)).toBe(false)
    expect(widerThanParent('view', parent)).toBe(false)
    expect(widerThanParent('reply', parent)).toBe(true)
  })
})

describe('inviteExceedsParent', () => {
  test('nobody joins a sub-agent who cannot open its parent', () => {
    expect(inviteExceedsParent({ ...parent, generalAccess: 'none' }, 'stranger', 'view')).toBe(true)
  })

  test('the invite role is capped by what the parent gives that person', () => {
    expect(inviteExceedsParent(parent, 'teammate', 'view')).toBe(false)
    expect(inviteExceedsParent(parent, 'teammate', 'reply')).toBe(true)
    expect(inviteExceedsParent(parent, 'bo', 'reply')).toBe(true)
    expect(inviteExceedsParent(parent, 'ann', 'manage')).toBe(false)
  })

  test("the parent's owner may be given anything", () => {
    expect(inviteExceedsParent(parent, 'owner', 'manage')).toBe(false)
  })
})

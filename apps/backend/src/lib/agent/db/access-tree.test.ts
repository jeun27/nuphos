import { describe, expect, test } from 'bun:test'

import { conversationAccess } from './access'
import {
  applyShareChange,
  inheritedGrant,
  inviteExceedsParent,
  narrowToParent,
  widerThanParent,
} from './access-tree'

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

describe('narrowToParent', () => {
  test('keeps the child no wider than its parent, for the team and for each person', () => {
    const child = {
      generalAccess: 'reply' as const,
      participantIds: ['ann', 'bo', 'carl'],
      viewOnlyIds: [],
      managerIds: ['ann', 'bo'],
    }

    expect(narrowToParent(child, parent)).toEqual({
      generalAccess: 'view',
      participantIds: ['ann', 'bo', 'carl'],
      viewOnlyIds: ['bo', 'carl'],
      managerIds: ['ann'],
    })
  })

  test('drops whoever the parent shuts out and never widens a private child', () => {
    const closed = { ...parent, generalAccess: 'none' as const }

    expect(narrowToParent({ generalAccess: 'none', participantIds: ['carl'] }, closed)).toEqual({
      generalAccess: 'none',
      participantIds: [],
      viewOnlyIds: [],
      managerIds: [],
    })
  })
})

describe('applyShareChange', () => {
  test('works out the grant each change leaves behind', () => {
    expect(applyShareChange(parent, { kind: 'remove', userId: 'ann' })).toEqual({
      generalAccess: 'view',
      participantIds: ['bo'],
      viewOnlyIds: ['bo'],
      managerIds: [],
    })
    expect(
      applyShareChange(parent, { kind: 'role', userIds: ['bo'], role: 'manage' }),
    ).toMatchObject({
      viewOnlyIds: [],
      managerIds: ['ann', 'bo'],
    })
    expect(
      applyShareChange(parent, { kind: 'invite', userIds: ['carl'], role: 'view' }),
    ).toMatchObject({
      participantIds: ['ann', 'bo', 'carl'],
      viewOnlyIds: ['bo', 'carl'],
    })
    expect(applyShareChange(parent, { kind: 'access', generalAccess: 'none' }).generalAccess).toBe(
      'none',
    )
  })

  test('a role change for someone not in the conversation adds nobody', () => {
    expect(applyShareChange(parent, { kind: 'role', userIds: ['zed'], role: 'manage' })).toEqual(
      inheritedGrant(parent),
    )
  })
})

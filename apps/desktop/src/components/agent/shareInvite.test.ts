import assert from 'node:assert/strict'
import { test } from 'node:test'

import { firstAdminName, pickerNotice, workspaceInviteTarget } from './shareInvite.ts'

import type { TeamMember } from '../../types'

const bryan = {
  id: 'u-bryan',
  name: 'Bryan Yeung',
  email: 'bryan@example.com',
  role: 'ADMINISTRATOR',
}
const sam = { id: 'u-sam', name: 'Sam Ortiz', email: 'Sam@example.com', role: 'MEMBER' }
const MEMBERS = [sam, bryan] as TeamMember[]

test('the Share workspace field invites a new email, adds a teammate, and skips someone here', () => {
  const here = new Set(['u-bryan'])

  assert.deepEqual(workspaceInviteTarget(' Shant@Example.com ', MEMBERS, here), {
    kind: 'new',
    email: 'shant@example.com',
  })
  assert.equal(workspaceInviteTarget('sam@example.com', MEMBERS, here).kind, 'member')
  assert.equal(workspaceInviteTarget('bryan@example.com', MEMBERS, here).kind, 'here')
  assert.equal(workspaceInviteTarget('shant@example', MEMBERS, here).kind, 'none')
  assert.equal(workspaceInviteTarget('a@b@example.com', MEMBERS, here).kind, 'none')
  assert.equal(workspaceInviteTarget('shant@example.com', null, here).kind, 'none')
})

test('the teammate search says what to do when nobody is left or nobody matches', () => {
  assert.deepEqual(pickerNotice('', null, 0, 0), { kind: 'loading' })
  assert.deepEqual(pickerNotice('shant@example.com', MEMBERS, 0, 0), {
    kind: 'invite',
    email: 'shant@example.com',
  })
  assert.deepEqual(pickerNotice('shant@example.com', MEMBERS, 2, 0), {
    kind: 'invite',
    email: 'shant@example.com',
  })
  assert.deepEqual(pickerNotice('', MEMBERS, 0, 0), { kind: 'everyone-here' })
  // A teammate's own email is not an invite, and everyone being here is still only a hint.
  assert.deepEqual(pickerNotice('bryan@example.com', MEMBERS, 0, 0), { kind: 'everyone-here' })
  assert.deepEqual(pickerNotice('zed', MEMBERS, 2, 0), { kind: 'no-match' })
  assert.equal(pickerNotice('sa', MEMBERS, 2, 1), null)
})

test('a non-admin is pointed at the first admin, never at themselves', () => {
  assert.equal(firstAdminName(MEMBERS, 'u-sam'), 'Bryan Yeung')
  assert.equal(firstAdminName(MEMBERS, 'u-bryan'), null)
  assert.equal(firstAdminName(null, 'u-sam'), null)
  assert.equal(
    firstAdminName([{ ...bryan, name: '' }] as TeamMember[], 'u-sam'),
    'bryan@example.com',
  )
})

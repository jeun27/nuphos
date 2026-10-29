import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createWorkspaceTab } from '../workspaceTabFactory.ts'

import { chatLinkBlocked } from './chatLinkGate.ts'
import { createWorkspaceState, selectScope } from './store/workspaceState.ts'
import { createWorkspaceStore } from './store/workspaceStore.ts'

const MINE = 'aaaaaaaaaaaaaaaaaaaaaaaa'
const THEIRS = 'bbbbbbbbbbbbbbbbbbbbbbbb'

test('a chat link into a team the account is not in is blocked once teams are known', () => {
  assert.equal(chatLinkBlocked([{ id: MINE }], THEIRS), true)
  assert.equal(chatLinkBlocked([{ id: MINE }], MINE), false)
  // Teams not loaded yet, no team, or a malformed one: the opener decides as before.
  assert.equal(chatLinkBlocked(null, THEIRS), false)
  assert.equal(chatLinkBlocked([{ id: MINE }], undefined), false)
  assert.equal(chatLinkBlocked([{ id: MINE }], 'not-a-team'), false)
})

function setup() {
  let seq = 0
  const store = createWorkspaceStore(createWorkspaceState(), {
    createTab: (teamId) => ({ ...createWorkspaceTab(teamId), id: `tab-${String(++seq)}` }),
  })

  store.actions.retainTeams([MINE], MINE)
  store.actions.selectSession('mine-1', { teamId: MINE })

  return store
}

test('selectSession ignores a team the account is not in, keeping the workspace where it is', () => {
  const store = setup()
  const before = store.getState()

  store.actions.selectSession('theirs-1', { teamId: THEIRS })
  assert.equal(store.getState(), before)
  assert.equal(store.getState().sessionId, 'mine-1')
  assert.equal(selectScope(store.getState())?.teamId, MINE)
})

test('a team joined after the first load is opened once the store knows it', () => {
  const store = setup()

  store.actions.knowTeams([MINE, THEIRS])
  store.actions.selectSession('theirs-1', { teamId: THEIRS })
  assert.equal(store.getState().sessionId, 'theirs-1')
  assert.equal(store.getState().teamScope?.teamId, THEIRS)
})

test('before the teams load, a team-scoped selection still goes through', () => {
  const store = createWorkspaceStore(createWorkspaceState(), {
    createTab: (teamId) => createWorkspaceTab(teamId),
  })

  store.actions.selectSession('restored', { teamId: THEIRS })
  assert.equal(store.getState().teamScope?.teamId, THEIRS)
})

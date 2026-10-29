import { beforeEach, describe, expect, test } from 'bun:test'

import { useDb } from '@/lib/test/doubles/db'
import { portabilityDb } from '@/lib/test/runtime-portability-db'

import { applyShareChange } from './access-tree'
import { syncDescendantAccess } from './access-tree-sync'

import type * as dbActual from '@/lib/db'

let memory = portabilityDb()

useDb({ db: (() => memory) as unknown as typeof dbActual.db })

const rows = () => memory.rows('agent_conversations')
const doc = (sessionId: string) => rows().find((row) => row.sessionId === sessionId)
const scope = { userId: 'owner', teamId: 'team' }
const shared = {
  generalAccess: 'none',
  participantIds: ['ann', 'bo'],
  viewOnlyIds: [],
  managerIds: [],
}

beforeEach(() => {
  memory = portabilityDb()
  rows().push(
    { ...scope, sessionId: 'manager', ...shared },
    { ...scope, sessionId: 'worker', parentSessionId: 'manager', ...shared },
    { ...scope, sessionId: 'nested', parentSessionId: 'worker', ...shared },
    { userId: 'owner', teamId: 'other', sessionId: 'elsewhere', parentSessionId: 'manager' },
  )
})

describe('syncDescendantAccess', () => {
  test('narrowing first takes a removed person out of every sub-agent before the parent', async () => {
    const next = applyShareChange(doc('manager')!, { kind: 'remove', userId: 'bo' })

    await syncDescendantAccess('manager', scope, { grant: next, narrowOnly: true })

    // The parent write has not happened yet; if it now failed, Bo would still
    // be shut out of the sub-agents rather than left in them.
    expect(doc('manager')?.participantIds).toEqual(['ann', 'bo'])
    expect(doc('worker')?.participantIds).toEqual(['ann'])
    expect(doc('nested')?.participantIds).toEqual(['ann'])
  })

  test('narrowing first never widens, even for a widening change', async () => {
    const next = applyShareChange(doc('manager')!, { kind: 'access', generalAccess: 'reply' })

    await syncDescendantAccess('manager', scope, { grant: next, narrowOnly: true })
    expect(doc('worker')?.generalAccess).toBe('none')
  })

  test('a late sync reads the parent as it is now, not a stale snapshot', async () => {
    doc('manager')!.generalAccess = 'view'
    await syncDescendantAccess('manager', scope)

    expect(doc('worker')?.generalAccess).toBe('view')
    expect(doc('nested')?.generalAccess).toBe('view')
  })

  test('stays inside the owner and team', async () => {
    await syncDescendantAccess('manager', scope)
    expect(doc('elsewhere')?.generalAccess).toBeUndefined()
  })

  test('a tree past the limits is refused before anything is written', async () => {
    doc('manager')!.generalAccess = 'reply'
    await expect(
      syncDescendantAccess('manager', scope, { limits: { depth: 1, nodes: 50 } }),
    ).rejects.toMatchObject({ code: 'share_tree_too_large' })
    await expect(
      syncDescendantAccess('manager', scope, { limits: { depth: 16, nodes: 1 } }),
    ).rejects.toMatchObject({ code: 'share_tree_too_large' })
    expect(doc('worker')?.generalAccess).toBe('none')
  })
})

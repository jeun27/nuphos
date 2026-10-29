import { beforeEach, describe, expect, test } from 'bun:test'

import { useDb } from '@/lib/test/doubles/db'
import { portabilityDb } from '@/lib/test/runtime-portability-db'

import { setConversationParent } from './maintenance'

import type * as dbActual from '@/lib/db'

let memory = portabilityDb()

useDb({ db: (() => memory) as unknown as typeof dbActual.db })

const doc = (sessionId: string) =>
  memory.rows('agent_conversations').find((row) => row.sessionId === sessionId)
const parentOf = (sessionId: string) => doc(sessionId)?.parentSessionId

beforeEach(() => {
  memory = portabilityDb()
  memory.rows('agent_conversations').push(
    {
      sessionId: 'manager',
      userId: 'u',
      teamId: 't',
      generalAccess: 'view',
      participantIds: ['ann'],
      viewOnlyIds: [],
      managerIds: ['ann'],
    },
    { sessionId: 'worker', userId: 'u', teamId: 't', generalAccess: 'reply' },
    { sessionId: 'nested', userId: 'u', teamId: 't', parentSessionId: 'worker' },
    { sessionId: 'other-team', userId: 'u', teamId: 'x' },
    { sessionId: 'other-user', userId: 'v', teamId: 't' },
  )
})

describe('setConversationParent', () => {
  test('nests a conversation under another one of the same owner and team', async () => {
    expect(await setConversationParent('worker', 'u', 't', 'manager')).toBe('ok')
    expect(parentOf('worker')).toBe('manager')
  })

  test('nesting narrows the thread and everything below it to the new parent', async () => {
    await setConversationParent('worker', 'u', 't', 'manager')

    for (const id of ['worker', 'nested']) {
      expect(doc(id)).toMatchObject({
        generalAccess: 'view',
        participantIds: [],
        viewOnlyIds: [],
        managerIds: [],
      })
    }
    expect(doc('worker')?.ownAccess).toBe(true)
  })

  test('nesting a private thread under a shared chat never shares it', async () => {
    doc('worker')!.generalAccess = 'none'
    await setConversationParent('worker', 'u', 't', 'manager')

    expect(doc('worker')?.generalAccess).toBe('none')
    expect(doc('nested')?.generalAccess).toBe('none')
  })

  test('unlinking a thread an agent opened makes it private again', async () => {
    doc('nested')!.generalAccess = 'reply'
    expect(await setConversationParent('nested', 'u', 't', null)).toBe('ok')
    expect(parentOf('nested')).toBeUndefined()
    expect(doc('nested')).toMatchObject({ generalAccess: 'none', participantIds: [] })
  })

  test('unlinking a thread shared by hand keeps its own sharing', async () => {
    Object.assign(doc('nested')!, { generalAccess: 'view', ownAccess: true })
    await setConversationParent('nested', 'u', 't', null)
    expect(doc('nested')?.generalAccess).toBe('view')
  })

  test('rejects itself, a descendant, and conversations outside the owner and team', async () => {
    for (const parent of ['worker', 'nested', 'other-team', 'other-user', 'missing']) {
      expect(await setConversationParent('worker', 'u', 't', parent)).toBe('invalid_parent')
    }
    expect(parentOf('worker')).toBeUndefined()
    expect(doc('worker')?.generalAccess).toBe('reply')
  })

  test('reports a conversation the caller does not own', async () => {
    expect(await setConversationParent('other-user', 'u', 't', 'manager')).toBe('not_found')
    expect(await setConversationParent('other-user', 'u', 't', null)).toBe('not_found')
  })
})

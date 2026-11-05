import { describe, expect, test } from 'bun:test'

import { useAgentDb } from '@/lib/test/doubles/agent-db'

import { createClaudeCodeAutonomousUpdateHandler } from './chat-preview-autonomous'
import { CONNECTION_LOST_TOOL_ERROR } from './chat-preview-handoff'

import type { ClaudeCodeAutonomousContext } from '@/lib/claude-code-preview/agent-chat-runtime'
import type { PreviewToolStep } from '@/lib/claude-code-preview/preview-transcript'

// Persistence itself is covered by the DB helper; these tests isolate turn
// routing and lifecycle ordering.
const persistedIds: string[] = []
const persistedParts: unknown[] = []
let persist: () => Promise<boolean> = async () => false

useAgentDb({
  appendAutonomousConversationTurn: (args) => {
    persistedIds.push(args.message.id)
    persistedParts.push(args.message.parts)

    return persist()
  },
})

const context: ClaudeCodeAutonomousContext = {
  teamId: 'team-1',
  conversationId: 'conversation-1',
  userId: 'actor-1',
  conversationOwnerUserId: 'owner-1',
  locale: 'en-US',
}

const request = {
  sessionId: 'openab-1',
  toolCall: { toolCallId: 'tool-1', title: 'Run kubectl delete' },
  options: [{ optionId: 'allow-once', name: 'Allow once', kind: 'allow_once' }],
}

function harness(steps: PreviewToolStep[] = []) {
  const authorizeCalls: Record<string, unknown>[] = []
  const begins: ClaudeCodeAutonomousContext[] = []
  const messageIds: string[] = []
  const frames: Record<string, unknown>[] = []
  const calls: string[] = []
  const handler = createClaudeCodeAutonomousUpdateHandler({
    begin: (begun, messageId) => {
      begins.push(begun)
      messageIds.push(messageId)

      return {
        emit: (frame) => {
          calls.push('emit')
          frames.push(frame)
        },
        finish: () => {
          calls.push('finish')
        },
        handleTool: () => {},
        toolSteps: () => steps,
      }
    },
    authorize: (args) => {
      authorizeCalls.push(args)

      return Promise.resolve({ outcome: { outcome: 'selected', optionId: 'allow-once' } })
    },
  })

  return { handler, authorizeCalls, begins, frames, calls, messageIds }
}

describe('autonomous turn permission routing', () => {
  test('passes the actor as userId and the durable owner as conversationOwnerUserId', async () => {
    const h = harness()

    expect(await h.handler.permission({ ...context, request })).toEqual({
      outcome: { outcome: 'selected', optionId: 'allow-once' },
    })
    expect(h.authorizeCalls).toHaveLength(1)
    expect(h.authorizeCalls[0]).toMatchObject({
      userId: 'actor-1',
      conversationOwnerUserId: 'owner-1',
      conversationId: 'conversation-1',
    })
  })

  test('reuses the turn an autonomous update already opened', async () => {
    const h = harness()

    void h.handler.update({ ...context, update: { kind: 'text', text: 'Timer fired.' } })
    await h.handler.permission({ ...context, request })

    expect(h.begins).toHaveLength(1)
    expect(h.begins[0]?.conversationOwnerUserId).toBe('owner-1')
    expect(h.frames[0]).toEqual({ type: 'text-delta', delta: 'Timer fired.' })
  })
})

describe('autonomous turn interruption', () => {
  test('reports the interruption before the turn is finished', async () => {
    const h = harness()

    await h.handler.update({ ...context, update: { kind: 'text', text: 'Writing the note…' } })
    await h.handler.update({
      ...context,
      update: { kind: 'interrupted', reason: 'connection_closed' },
    })

    // The notice goes out before `finish` writes the terminal frames. Reversed,
    // the client would see a completed turn with an error after it.
    expect(h.calls).toEqual(['emit', 'emit', 'finish'])
    expect(h.frames[1]).toMatchObject({
      type: 'turn-interrupted',
      reason: 'error',
      message: 'The agent stopped before it finished. Send a message to continue.',
    })
  })

  test('a CLI that died between turns gets its own notice, in the transcript', async () => {
    const before = persistedIds.length
    const h = harness()
    const message = 'Claude Code ran out of memory. Send a message to continue.'

    persist = async () => true
    await h.handler.update({
      ...context,
      update: { kind: 'interrupted', reason: 'connection_closed', message },
    })
    await Promise.resolve()

    expect(h.begins).toHaveLength(1)
    expect(h.frames).toEqual([expect.objectContaining({ type: 'turn-interrupted', message })])
    expect(h.calls).toEqual(['emit', 'finish'])
    expect(persistedIds.slice(before)).toEqual(h.messageIds)
  })

  test('an interruption without a cause and no open turn stays silent', async () => {
    const h = harness()

    await h.handler.update({
      ...context,
      update: { kind: 'interrupted', reason: 'runtime_interrupted' },
    })
    expect(h.begins).toHaveLength(0)
  })

  test('a dropped runtime connection ends the turn without saying the agent stopped', async () => {
    const h = harness([{ toolCallId: 'tool-1', toolName: 'Bash', input: {} }])

    await h.handler.update({ ...context, update: { kind: 'text', text: 'Waiting for the build…' } })
    await h.handler.update({
      ...context,
      update: {
        kind: 'agent',
        update: { kind: 'tool', toolCallId: 'tool-1', title: 'Bash', status: 'in_progress' },
      },
    } as never)
    await h.handler.update({
      ...context,
      update: { kind: 'interrupted', reason: 'runtime_connection_lost' },
    })

    // The runtime keeps the agent running and the session reattaches; its
    // continuation arrives as the next turn, exactly as for an interactive one.
    expect(h.frames.some((frame) => frame.type === 'turn-interrupted')).toBe(false)
    expect(h.calls.at(-1)).toBe('finish')
    expect(JSON.stringify(persistedParts.at(-1))).toContain(CONNECTION_LOST_TOOL_ERROR)
  })

  test('a normal completion finishes without an error', async () => {
    const h = harness()

    await h.handler.update({ ...context, update: { kind: 'text', text: 'Done.' } })
    await h.handler.update({
      ...context,
      update: { kind: 'complete', origin: { kind: 'task-notification' } },
    })

    expect(h.calls).toEqual(['emit', 'finish'])
  })
})

test('actual output opens a turn, and idle closes it without waiting for storage', async () => {
  const h = harness()
  let release!: (value: boolean) => void

  persist = () =>
    new Promise<boolean>((resolve) => {
      release = resolve
    })
  try {
    await h.handler.update({ ...context, update: { kind: 'status', status: 'active' } })
    expect(h.begins).toHaveLength(0)
    await h.handler.update({ ...context, update: { kind: 'text', text: 'Done' } })
    await h.handler.update({ ...context, update: { kind: 'complete' } })
    expect(h.calls).toEqual(['emit', 'finish'])
    await h.handler.update({ ...context, update: { kind: 'status', status: 'active' } })
    expect(h.begins).toHaveLength(1)
    await h.handler.update({ ...context, update: { kind: 'text', text: 'Next continuation' } })
    expect(h.begins).toHaveLength(2)
    release(false)
  } finally {
    persist = async () => false
  }
})

test('runtime status broadcasts do not invent autonomous transcript turns', async () => {
  const h = harness()

  for (const phase of ['configuring', 'loading', 'working', 'resuming', 'finishing']) {
    await h.handler.update({
      ...context,
      update: {
        kind: 'status',
        status: 'active',
        runtimeSnapshot: { schemaVersion: 2, state: 'active', phase },
      },
    })
  }
  await h.handler.update({ ...context, update: { kind: 'complete' } })
  expect(h.begins).toHaveLength(0)
  expect(h.frames).toHaveLength(0)

  await h.handler.update({
    ...context,
    update: { kind: 'text', text: 'Actual runtime continuation' },
  })
  await h.handler.update({
    ...context,
    update: {
      kind: 'status',
      status: 'active',
      runtimeSnapshot: { schemaVersion: 2, state: 'active', phase: 'resuming' },
    },
  })
  expect(h.begins).toHaveLength(1)
  expect(h.frames.at(-1)).toMatchObject({ type: 'runtime-state', snapshot: { phase: 'resuming' } })
})

test('persisted autonomous message keeps the identity sent with its start event', async () => {
  const h = harness()

  await h.handler.update({ ...context, update: { kind: 'text', text: 'Continued' } })
  await h.handler.update({ ...context, update: { kind: 'complete' } })
  expect(persistedIds.at(-1)).toBe(h.messageIds[0])
})

test('a completed autonomous placeholder is not appended as an answer', async () => {
  const before = persistedIds.length
  const h = harness()

  await h.handler.update({ ...context, update: { kind: 'text', text: '_(no response)_' } })
  await h.handler.update({
    ...context,
    update: { kind: 'complete', origin: { kind: 'task-notification' } },
  })
  expect(persistedIds).toHaveLength(before)
  expect(h.calls).toEqual(['emit', 'finish'])
})
test('a placeholder cannot hide an autonomous runtime interruption', async () => {
  const h = harness()

  await h.handler.update({ ...context, update: { kind: 'text', text: '_(no response)_' } })
  await h.handler.update({
    ...context,
    update: { kind: 'interrupted', reason: 'connection_closed' },
  })
  expect(h.calls).toEqual(['emit', 'emit', 'finish'])
})

// After a dropped runtime connection the call's card is in the turn that
// started it, marked "connection dropped". Its result must land on that card,
// not open a new turn with a second, nameless card.
describe('a result for a call that began before the connection dropped', () => {
  const tracked = () => {
    const results: string[] = []
    const begins: string[] = []
    const handler = createClaudeCodeAutonomousUpdateHandler({
      begin: (_context, messageId) => {
        begins.push(messageId)

        return { emit: () => {}, finish: () => {}, handleTool: () => {}, toolSteps: () => [] }
      },
      earlierToolResult: async (_context, update) => {
        results.push(`${update.toolCallId}:${update.status}`)
      },
    })

    return { handler, results, begins }
  }
  const tool = (status: string, rawInput?: unknown) => ({
    kind: 'agent' as const,
    update: { kind: 'tool' as const, toolCallId: 'merge', title: '', status, rawInput },
  })

  test('goes to the earlier card and opens no turn', async () => {
    const h = tracked()

    await h.handler.update({ ...context, update: tool('completed') })
    expect(h.results).toEqual(['merge:completed'])
    expect(h.begins).toEqual([])
  })

  test('a call that starts here is this turn’s own', async () => {
    const h = tracked()

    await h.handler.update({ ...context, update: tool('in_progress', { command: 'ls' }) })
    expect(h.results).toEqual([])
    expect(h.begins).toHaveLength(1)
  })
})

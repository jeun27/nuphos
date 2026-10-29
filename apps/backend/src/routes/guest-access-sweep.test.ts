import { readdirSync } from 'node:fs'

import { describe, expect, test } from 'bun:test'

import { useDb } from '@/lib/test/doubles/db'
import { useIdentity } from '@/lib/test/doubles/identity'
import { portabilityDb } from '@/lib/test/runtime-portability-db'

import declared from './route-access.json'

import type * as dbActual from '@/lib/db'

// A guest of one chat signs in and calls every route the app serves with that
// chat's id and team. Only the guest view may answer; everything else about
// the chat or its team fails closed.
const ID = '64b5f1c2e4b0a1d2c3e4f501'
const GUEST = '64b5f1c2e4b0a1d2c3e4f5ee'
const OWNER = '64b5f1c2e4b0a1d2c3e4f5aa'
const memory = portabilityDb()
const shared = {
  sessionId: ID,
  userId: OWNER,
  teamId: ID,
  title: 'Build the app',
  firstMessage: 'Build it',
  messageCount: 1,
  createdAt: new Date(0),
  lastActiveAt: new Date(0),
  // The widest sharing there is, so only the guest grant can be what says no.
  generalAccess: 'reply',
  guestIds: [GUEST],
}

memory.rows('agent_conversations').push(shared, {
  ...shared,
  sessionId: '64b5f1c2e4b0a1d2c3e4f502',
  parentSessionId: ID,
})
useDb({ db: (() => memory) as unknown as typeof dbActual.db })
useIdentity({
  authenticateToken: async (token: string) =>
    token === 'guest'
      ? ({ user: { id: GUEST, email: 'gabi@example.com', name: 'Gabi' } } as never)
      : null,
  getTeamMembership: async () => null,
})

for (const file of readdirSync(new URL('../lib/test/doubles', import.meta.url))) {
  await import(`@/lib/test/doubles/${file}`)
}

const { app } = await import('@/index-app')
const table = declared as Record<string, string>
const endpoints = [
  ...new Set(app.routes.filter((r) => r.method !== 'ALL').map((r) => `${r.method} ${r.path}`)),
].filter((key) => table[key] && table[key] !== 'public')

const concrete = (path: string) =>
  path
    .replace(/:file\{[^}]*\}\}/, '0a')
    .replace(/:version\{[^}]*\}\}/, '0123456789ab')
    .replace(/:\w+(\{[^}]*\})?\??/g, ID)
    .replace(/\*/g, 'x')

async function call(key: string) {
  const [method, path] = key.split(' ') as [string, string]
  const res = await app.request(`${concrete(path)}?teamId=${ID}&sessionId=${ID}`, {
    method,
    headers: { Authorization: 'Bearer guest', 'Content-Type': 'application/json' },
    ...(method === 'GET' || method === 'HEAD'
      ? {}
      : { body: JSON.stringify({ teamId: ID, sessionId: ID, text: 'hi', enabled: true }) }),
  })

  return res.status
}

// What any signed-in person may call about themselves. Each was checked to
// answer a guest with only their own data, or nothing, for this chat and team.
const PERSONAL = [
  'GET /auth/me', // their own account
  'GET /auth/account-deletion', // their own deletion status
  'GET /teams', // the teams they belong to: none here
  'GET /agent/triggers/scheduler-status', // the scheduler's own health, no team data
  'POST /agent/chat/:streamId/report-failure', // a telemetry beacon about their own run
  'GET /agent/memories/attribution/:sessionId', // personal rows only: theirs, so none
  'GET /agent/memories/scorecard', // their own turns only
  'GET /agent/credential-options', // their personal options; no verified team
  'GET /agent/auto-mode/policy/rules', // always an empty list
  'GET /agent/devices', // their own computers
  'POST /agent/devices/join-tokens', // a join token for their own computer
  'GET /agent/devices/share-approvals', // empty for a non-member
  'GET /agent/devices/share-approvals/mine', // their own request's status
  'POST /mcp', // JSON-RPC; its tools check team membership and ownership
  'GET /personal-credentials', // their own credentials
]
// The guest's one way in, tested on its own in routes-conversation-guests.test.ts.
const GUEST_VIEW = 'GET /agent/guest/conversations/:sessionId'

describe('a guest of one chat shared team-wide', () => {
  test('gets nothing from any route but their own account and the guest view', async () => {
    const answered: string[] = []

    for (const key of endpoints) {
      if (key === GUEST_VIEW) continue
      if ((await call(key)) < 400) answered.push(key)
    }
    const byName = (a: string, b: string) => a.localeCompare(b)

    expect(answered.toSorted(byName)).toEqual(PERSONAL.toSorted(byName))
  })

  test('is refused by every team route', async () => {
    const answered: string[] = []

    for (const key of endpoints.filter((entry) => entry.includes(' /teams/:teamId'))) {
      const status = await call(key)

      if (status !== 403) answered.push(`${key} → ${String(status)}`)
    }
    expect(answered).toEqual([])
  })
})

import { beforeEach, describe, expect, test } from 'bun:test'

import { resolveSharedDevice, roomShareLevel } from './local-share'

import type { LocalShareDeps } from './local-share'
import type { LocalShareLevel } from './local-share-types'
import type { AgentDevice } from './store'

// Sam steers Bryan's own conversation, which runs on Bryan's Mac. Nothing of
// the Mac is shared with Sam outside this room.
const mac = { userId: 'bryan', deviceId: 'mac', label: 'MacBook' } as AgentDevice
let ceiling: LocalShareLevel = 'approve'
let approval: 'pending' | 'approved' | 'denied' | null = null
let requested: Record<string, unknown>[] = []

const deps: LocalShareDeps = {
  ceiling: async () => ceiling,
  isMember: async () => true,
  listShared: async () => [],
  getDevice: async (ownerId, deviceId) => (ownerId === 'bryan' && deviceId === 'mac' ? mac : null),
  findApproval: async () => (approval ? ({ status: approval } as never) : null),
  requestApproval: async (input) => {
    requested.push(input)
  },
}

const call = (teamSteer: boolean, actor = 'sam') => ({
  teamId: 'team',
  ref: { userId: 'bryan', deviceId: 'mac', provider: 'claude-code' as const },
  userId: actor,
  purpose: 'transport' as const,
  use: { sessionId: 'room', room: { ownerId: 'bryan', teamSteer } },
})

beforeEach(() => {
  ceiling = 'approve'
  approval = null
  requested = []
})

describe('a teammate steering the owner’s room on the owner’s computer', () => {
  test('waits for the owner to allow it, and asks once, marked as a room request', async () => {
    ceiling = 'full'
    await expect(resolveSharedDevice(call(false), deps)).rejects.toMatchObject({
      code: 'local_share_approval_required',
    })
    expect(requested).toEqual([
      { device: mac, teamId: 'team', actorId: 'sam', sessionId: 'room', room: true },
    ])
  })

  test('runs once the owner said yes', async () => {
    approval = 'approved'
    expect(await resolveSharedDevice(call(false), deps)).toBe(mac)
  })

  test('runs without asking where the owner let the team steer the room', async () => {
    ceiling = 'full'
    expect(await resolveSharedDevice(call(true), deps)).toBe(mac)
    expect(requested).toEqual([])
  })

  test('the team ceiling caps the owner’s switch: approve still asks, off refuses', async () => {
    await expect(resolveSharedDevice(call(true), deps)).rejects.toMatchObject({
      code: 'local_share_approval_required',
    })
    ceiling = 'off'
    await expect(resolveSharedDevice(call(true), deps)).rejects.toMatchObject({
      code: 'local_runtime_owner_only',
    })
  })

  test('a room on one owner never opens another owner’s computer', async () => {
    const other = {
      ...call(true),
      use: { sessionId: 'room', room: { ownerId: 'sam', teamSteer: true } },
    }

    await expect(resolveSharedDevice(other, deps)).rejects.toMatchObject({ status: 404 })
  })

  test('a channel or another agent never steers it', async () => {
    ceiling = 'full'
    const fromSlack = { ...call(true), use: { ...call(true).use, source: 'slack' } }

    await expect(resolveSharedDevice(fromSlack, deps)).rejects.toMatchObject({
      code: 'local_share_unattended',
    })
  })
})

test('a Box is never steered as a room', () => {
  expect(roomShareLevel({ ...mac, box: {} } as AgentDevice, true, 'full')).toBeNull()
  expect(roomShareLevel(mac, true, 'full')).toBe('full')
  expect(roomShareLevel(mac, false, 'full')).toBe('approve')
})

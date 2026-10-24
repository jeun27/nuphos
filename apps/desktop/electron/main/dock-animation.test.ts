import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { DockAnimation, parseDockFrameManifest } from './dock-animation.ts'

function harness(frames: string[], fps = 10) {
  let clock = 0
  let reduced = false
  let loads = 0
  let pending: { run: () => void; at: number } | undefined
  const shown: string[] = []
  const animation = new DockAnimation<string>({
    fps,
    load: () => {
      loads++

      return frames
    },
    setIcon: (frame) => shown.push(frame),
    reducedMotion: () => reduced,
    now: () => clock,
    setTimer: (run, ms) => {
      pending = { run, at: clock + ms }

      return pending
    },
    clearTimer: (timer) => {
      if (timer === pending) pending = undefined
    },
  })
  // Runs due ticks, each `lateBy` ms after it was due.
  const advance = (to: number, lateBy = 0) => {
    while (pending && pending.at + lateBy <= to) {
      const due = pending

      pending = undefined
      clock = due.at + lateBy
      due.run()
    }
    clock = to
  }

  return {
    animation,
    shown,
    advance,
    loads: () => loads,
    pending: () => pending !== undefined,
    reduce: (value: boolean) => {
      reduced = value
    },
  }
}

test('start plays frames on the clock and loads them once', () => {
  const h = harness(['a', 'b', 'c'])

  h.animation.setActive(true)
  assert.equal(h.animation.running, true)
  h.advance(250)
  assert.deepEqual(h.shown, ['a', 'b', 'c'])
  h.advance(350)
  assert.deepEqual(h.shown, ['a', 'b', 'c', 'a'])
  h.animation.setActive(false)
  h.animation.setActive(true)
  assert.equal(h.loads(), 1)
})

test('a repeated frame does not set the icon again', () => {
  const h = harness(['a', 'a', 'b'])

  h.animation.setActive(true)
  h.advance(250)
  assert.deepEqual(h.shown, ['a', 'b'])
})

test('a late tick skips ahead instead of slowing down', () => {
  const h = harness(['a', 'b', 'c', 'd', 'e'])

  h.animation.setActive(true)
  // Every tick fires 150 ms late: frames still follow the wall clock.
  h.advance(450, 150)
  assert.deepEqual(h.shown, ['a', 'c', 'e'])
})

test('stop clears the timer and restores the still frame', () => {
  const h = harness(['a', 'b', 'c'])

  h.animation.setActive(true)
  h.advance(150)
  assert.equal(h.shown.at(-1), 'b')
  h.animation.setActive(false)
  assert.equal(h.animation.running, false)
  assert.equal(h.pending(), false)
  assert.equal(h.shown.at(-1), 'a')
  h.advance(1000)
  assert.equal(h.shown.at(-1), 'a')
})

test('reduce motion keeps the icon still, and applies mid-run', () => {
  const h = harness(['a', 'b', 'c'])

  h.reduce(true)
  h.animation.setActive(true)
  assert.equal(h.animation.running, false)
  assert.equal(h.loads(), 0)
  assert.deepEqual(h.shown, [])

  h.reduce(false)
  h.animation.sync()
  h.advance(150)
  assert.equal(h.shown.at(-1), 'b')
  h.reduce(true)
  h.animation.sync()
  assert.equal(h.animation.running, false)
  assert.equal(h.shown.at(-1), 'a')
})

test('the manifest must point at frames it lists', () => {
  assert.deepEqual(parseDockFrameManifest({ fps: 30, files: ['f-000.png'], sequence: [0, 0] }), {
    fps: 30,
    files: ['f-000.png'],
    sequence: [0, 0],
  })
  assert.throws(() => parseDockFrameManifest({ fps: 30, files: ['f-000.png'], sequence: [1] }))
  assert.throws(() => parseDockFrameManifest({ fps: 30, files: ['../x.png'], sequence: [0] }))
  assert.throws(() => parseDockFrameManifest({ fps: 0, files: ['f.png'], sequence: [0] }))
})

test('a packaged app ships every frame the manifest names', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
    build: { mac: { extraResources?: { from: string; to: string }[] } }
  }

  // dock-animation-electron.ts reads process.resourcesPath/dock-frames in a packaged macOS app.
  // The frames are mac-only: Windows and Linux never animate the Dock.
  assert.ok(
    pkg.build.mac.extraResources?.some(
      (r) => r.from === 'build/dock-frames' && r.to === 'dock-frames',
    ),
  )
  const dir = path.join(root, 'build/dock-frames')
  const manifest = parseDockFrameManifest(
    JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')),
  )

  for (const file of manifest.files) assert.ok(fs.existsSync(path.join(dir, file)), file)
})

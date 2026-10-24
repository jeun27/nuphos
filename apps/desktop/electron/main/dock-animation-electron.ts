import fs from 'node:fs'
import path from 'node:path'

import { app, ipcMain, nativeImage, systemPreferences } from 'electron'

import { DockAnimation, parseDockFrameManifest } from './dock-animation.ts'

import type { NativeImage, WebContents } from 'electron'

// Renderers that report a running session. The Dock animates while any of them does.
const running = new Set<WebContents>()
const tracked = new WeakSet<WebContents>()

const framesDir = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, 'dock-frames')
    : path.join(app.getAppPath(), 'build', 'dock-frames')

function initDockAnimation(): void {
  if (process.platform !== 'darwin' || !app.dock) return
  const dir = framesDir()
  let manifest: ReturnType<typeof parseDockFrameManifest>

  try {
    manifest = parseDockFrameManifest(
      JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')),
    )
  } catch (e) {
    console.warn('[dock-animation] no frames:', e)

    return
  }
  const animation = new DockAnimation<NativeImage>({
    fps: manifest.fps,
    load: () => {
      // The 256 px frames are 128 pt Retina images. Loaded at scale 1 they would be 256 pt,
      // and handing the Dock an image twice its largest tile costs about twice the CPU per frame.
      const images = manifest.files.map((file) =>
        nativeImage.createFromBuffer(fs.readFileSync(path.join(dir, file)), { scaleFactor: 2 }),
      )

      return manifest.sequence.map((i) => images[i])
    },
    setIcon: (image) => app.dock?.setIcon(image),
    reducedMotion: () => systemPreferences.getAnimationSettings().prefersReducedMotion,
  })
  const update = () => animation.setActive(running.size > 0)

  ipcMain.on('app:dockActivity', (event, active: unknown) => {
    const contents = event.sender

    if (active === true) running.add(contents)
    else running.delete(contents)
    if (!tracked.has(contents)) {
      tracked.add(contents)
      // A reload or a closed window stops reporting, so it stops counting.
      const forget = () => {
        running.delete(contents)
        update()
      }

      contents.on('did-navigate', forget)
      contents.once('destroyed', forget)
    }
    update()
  })
  systemPreferences.subscribeWorkspaceNotification(
    'NSWorkspaceAccessibilityDisplayOptionsDidChangeNotification',
    () => animation.sync(),
  )
}

app
  .whenReady()
  .then(initDockAnimation)
  .catch((e: unknown) => {
    console.error('[dock-animation]', e)
  })

// Renders the Napoleon app icon and the Dock animation frames from the vector avatar.
// Run with: pnpm exec electron scripts/make-napoleon-icon.mjs
// Every size is drawn from the SVG (never resized from another PNG), and the frames play
// the same idle loop as the in-app avatar (src/lib/botAvatarMotion.ts).
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { app, BrowserWindow } from 'electron'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// Each Dock icon swap costs the main process a fixed slice of CPU, so the rate sets the
// cost: 24 fps keeps the loop smooth at about 7% of a core while a session runs.
const FPS = 24
// The largest Dock tile is 128 pt, 256 px on Retina. 512 px frames cost the main process
// about 20% of a core and 190 MB while animating; 256 px costs about 8% and 54 MB.
const FRAME_PX = 256
const svg = fs
  .readFileSync(path.join(root, 'public/bot-avatars/14-napoleon.svg'), 'utf8')
  .replace(/<\?xml[^>]*>/, '')
const motion = fs.readFileSync(path.join(root, 'src/lib/botAvatarMotion.ts'), 'utf8')
const keyframes = motion.match(/const KEYFRAMES = `([\s\S]*?)`/)[1]
const period = Number(motion.match(/const PERIOD_S = (\d+)/)[1])

// The SVG offset centres the character's drawn outline (not its 256 px box) on the tile.
// Apple's macOS grid: an 824 px tile 100 px in from a 1024 canvas. White, with a hairline
// and a soft shadow so it holds its edge on a light Dock. Below 64 px the shadow would
// only blur, so the edge gets heavier instead.
const page = `<!doctype html><html><head><style>
html,body{margin:0;background:transparent;overflow:hidden}
.c{width:1024px;height:1024px;position:relative;transform-origin:0 0}
.t{position:absolute;left:100px;top:100px;width:824px;height:824px;border-radius:185px;overflow:hidden;
box-sizing:border-box;background:linear-gradient(180deg,#fff 0%,#fff 55%,#f3f3f5 100%);
border:3px solid rgba(0,0,0,.12);box-shadow:0 10px 24px rgba(0,0,0,.28),0 2px 4px rgba(0,0,0,.18)}
.small .t{border-width:28px;border-color:rgba(0,0,0,.13);box-shadow:none}
.t svg{position:absolute;left:61px;top:61px;width:700px;height:700px;overflow:visible}
.bot-body,.bot-eye{transform-box:fill-box}
.bot-body{transform-origin:50% 100%;animation:bot-body ${period}s infinite}
.bot-eye{transform-origin:50% 50%;animation:bot-eye ${period}s infinite}
${keyframes}
</style></head><body><div class="c">${'<div class="t">' + svg + '</div>'}</div></body></html>`

// A top-level await on whenReady would deadlock an ESM main, so the work runs in a callback.
async function run() {
  const win = new BrowserWindow({
    show: false,
    width: 1024,
    height: 1024,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: true },
  })
  win.webContents.setFrameRate(60)
  await win.loadURL('data:text/html;base64,' + Buffer.from(page).toString('base64'))

  async function shoot(px, seconds) {
    await win.webContents.executeJavaScript(`(() => {
      const c = document.querySelector('.c')
      c.style.transform = 'scale(${px / 1024})'
      c.classList.toggle('small', ${px < 64})
      for (const a of document.getAnimations()) { a.pause(); a.currentTime = ${seconds * 1000} }
    })()`)
    win.webContents.invalidate()
    await new Promise((r) => setTimeout(r, 50))
    const image = await win.webContents.capturePage({ x: 0, y: 0, width: px, height: px })
    const size = image.getSize()

    if (size.width !== px || size.height !== px)
      throw new Error(`captured ${size.width}x${size.height}, wanted ${px}`)

    return image.toPNG()
  }

  const iconset = path.join(root, 'build/icon.iconset')

  fs.mkdirSync(iconset, { recursive: true })
  for (const s of [16, 32, 64, 128, 256, 512]) {
    fs.writeFileSync(path.join(iconset, `icon_${s}x${s}.png`), await shoot(s, 0))
    fs.writeFileSync(path.join(iconset, `icon_${s}x${s}@2x.png`), await shoot(s * 2, 0))
  }
  const master = await shoot(1024, 0)

  fs.writeFileSync(path.join(iconset, 'icon_1024x1024.png'), master)
  fs.writeFileSync(path.join(root, 'build/icon.png'), master)
  execFileSync('iconutil', ['-c', 'icns', iconset, '-o', path.join(root, 'build/icon.icns')])

  // Frame 0 is the rest pose, the same picture as the still icon. Identical frames are
  // stored once; the manifest's sequence says which file each tick shows.
  const framesDir = path.join(root, 'build/dock-frames')

  fs.rmSync(framesDir, { recursive: true, force: true })
  fs.mkdirSync(framesDir, { recursive: true })
  const files = []
  const byHash = new Map()
  const sequence = []

  for (let i = 0; i < FPS * period; i++) {
    const png = await shoot(FRAME_PX, i / FPS)
    const hash = createHash('sha256').update(png).digest('hex')

    if (!byHash.has(hash)) {
      const file = `f-${String(files.length).padStart(3, '0')}.png`

      fs.writeFileSync(path.join(framesDir, file), png)
      byHash.set(hash, files.length)
      files.push(file)
    }
    sequence.push(byHash.get(hash))
  }
  fs.writeFileSync(
    path.join(framesDir, 'manifest.json'),
    JSON.stringify({ fps: FPS, files, sequence }) + '\n',
  )
  console.log(`icon written; ${sequence.length} frames, ${files.length} unique`)
}

// Without this the capture is converted to the display's colour profile and comes out washed.
app.commandLine.appendSwitch('force-color-profile', 'srgb')
app.dock?.hide()
app
  .whenReady()
  .then(run)
  .then(() => app.quit())
  .catch((e) => {
    console.error(e)
    app.exit(1)
  })

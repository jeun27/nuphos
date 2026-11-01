// node dev-e2e.mjs <outDir>: drives the running dev app (CDP 9333) through the fixture sign-in.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
const require = createRequire('/Users/jeun/.claude/skills/gstack/package.json')
const { chromium } = require('playwright')
const OUT = process.argv[2]; mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await chromium.connectOverCDP('http://127.0.0.1:9333')
const pages = () => b.contexts().flatMap((c) => c.pages())
const app = pages().find((p) => p.url().startsWith('http://localhost:5191'))
const box = await app.evaluate(() => [screenX, screenY, outerWidth, outerHeight])
// Frames come only from the app page and the popup page (CDP), never the screen.
mkdirSync(`${OUT}/frames`, { recursive: true })
const chrome = await app.evaluate(() => [outerWidth - innerWidth, outerHeight - innerHeight])
const frames = []
let recording = true
let known = new Set()
const popupPage = () => pages().find((p) => !known.has(p) && !p.isClosed())
async function capture(name) {
  const i = frames.length
  const f = { app: `${OUT}/frames/${i}-app.png` }
  await app.screenshot({ path: f.app })
  const pop = popupPage()
  if (pop) {
    try {
      const at = await pop.evaluate(() => [screenX, screenY, outerHeight - innerHeight])
      f.popup = `${OUT}/frames/${i}-popup.png`; await pop.screenshot({ path: f.popup })
      f.x = at[0] - box[0] - chrome[0]; f.y = at[1] - box[1] - chrome[1] + at[2]
    } catch {}
  }
  if (name) f.name = name
  frames.push(f)
}
const shot = (n) => capture(n)
await app.evaluate(() => {
  document.getElementById('e2e-dock')?.remove()
  const dock = document.createElement('div'); dock.id = 'e2e-dock'
  dock.style.cssText = 'position:fixed;top:40px;right:0;width:62%;bottom:0;z-index:99999;display:flex;flex-direction:column;background:#ecebe8;border-left:1px solid #ccc;font:13px -apple-system,system-ui'
  dock.innerHTML = '<div style="display:flex;gap:4px;padding:6px 8px 0" id="e2e-tabs"></div><div id="e2e-bar" style="background:#fff;padding:6px 10px;border-bottom:1px solid #ddd;font:12px ui-monospace,monospace;color:#555"></div>'
  const v = document.createElement('webview')
  v.setAttribute('src', 'http://localhost:4801/'); v.setAttribute('partition', 'persist:browser'); v.setAttribute('allowpopups', '')
  v.setAttribute('webpreferences', 'sandbox=yes,contextIsolation=yes'); v.style.cssText = 'flex:1;display:flex'
  const sync = () => { document.getElementById('e2e-bar').textContent = v.getURL(); document.getElementById('e2e-tabs').innerHTML = '<div style="background:#fff;border-radius:8px 8px 0 0;padding:6px 12px">' + (v.getTitle() || 'Browser') + '</div>' }
  for (const e of ['did-navigate', 'did-stop-loading', 'page-title-updated']) v.addEventListener(e, sync)
  dock.appendChild(v); document.body.appendChild(dock); window.__v = v
})
await app.waitForFunction(() => window.__v.getURL().startsWith('http://localhost:4801') && !window.__v.isLoading(), null, { timeout: 15000 })
const guest = (code) => app.evaluate((c) => window.__v.executeJavaScript(c, true), code)
known = new Set(pages())
const rec = (async () => { while (recording) { await capture(); await wait(150) } })()
await wait(1500); await shot('1-site')
const before = pages().length
await guest(`document.getElementById('google').click()`)
await wait(2500); await shot('2-after-click')
const popup = popupPage()
const report = { appWindow: box, tabAfterClick: await app.evaluate(() => ({ url: window.__v.getURL(), title: window.__v.getTitle() })), popupWindow: popup ? popup.url() : null, newWindows: pages().length - before }
report.authOpener = popup ? await popup.evaluate(() => !!window.opener) : await guest(`!!window.opener`)
if (popup) report.popupNode = await popup.evaluate(() => typeof require)
if (popup) await popup.click('#pick'); else await guest(`document.getElementById('pick').click()`)
await wait(2500); await shot('3-after-pick')
report.afterPick = { tab: await app.evaluate(() => ({ url: window.__v.getURL(), title: window.__v.getTitle() })), status: await guest(`document.getElementById('status')?.textContent ?? null`), popupStillOpen: !!popupPage() }
await wait(1500); recording = false; await rec
writeFileSync(`${OUT}/frames.json`, JSON.stringify(frames, null, 1))
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 1))
await app.evaluate(() => document.getElementById('e2e-dock')?.remove())
process.exit(0)

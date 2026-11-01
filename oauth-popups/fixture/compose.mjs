// node compose.mjs <runDir> <label>: frames.json -> composed/NNN.png, <label>.mp4, <label>.gif, named stills.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, copyFileSync } from 'node:fs'
const [dir, label] = process.argv.slice(2)
const frames = JSON.parse(readFileSync(`${dir}/frames.json`))
const out = `${dir}/composed`; mkdirSync(out, { recursive: true }); mkdirSync('out/assets', { recursive: true })
const w = Number(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width', '-of', 'csv=p=0', frames[0].app]).toString())
const k = w / 1400
frames.forEach((f, i) => {
  const dst = `${out}/${String(i).padStart(3, '0')}.png`
  if (f.popup) execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', f.app, '-i', f.popup, '-filter_complex', `[1]pad=iw+4:ih+4:2:2:color=0x8a8a8a[p];[0][p]overlay=${Math.round(f.x * k) - 2}:${Math.round(f.y * k) - 2}`, dst])
  else copyFileSync(f.app, dst)
  if (f.name) execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', dst, '-vf', 'scale=1400:-1', `out/assets/${label}-${f.name}.png`])
})
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '5', '-i', `${out}/%03d.png`, '-vf', 'scale=1400:-2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '15', '-movflags', '+faststart', `out/assets/${label}.mp4`])
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '5', '-i', `${out}/%03d.png`, '-vf', 'scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse', `out/assets/${label}.gif`])
console.log(label, frames.length, 'frames', frames.filter((f) => f.popup).length, 'with popup')

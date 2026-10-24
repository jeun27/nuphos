// Napoleon's idle loop in the macOS Dock while any session runs.
// The frames are decoded once, on the first start, and kept: a tick only swaps an image.

export type DockAnimationOptions<Frame> = {
  fps: number
  /** Called once, on the first start. One entry per frame; repeated frames share an object. */
  load: () => readonly Frame[]
  setIcon: (frame: Frame) => void
  reducedMotion: () => boolean
  now?: () => number
  setTimer?: (run: () => void, ms: number) => unknown
  clearTimer?: (timer: unknown) => void
}

export class DockAnimation<Frame> {
  private frames: readonly Frame[] | undefined
  private shown: Frame | undefined
  private timer: unknown
  private startedAt = 0
  private active = false
  private readonly interval: number
  private readonly now: () => number
  private readonly setTimer: (run: () => void, ms: number) => unknown
  private readonly clearTimer: (timer: unknown) => void
  private readonly options: DockAnimationOptions<Frame>

  constructor(options: DockAnimationOptions<Frame>) {
    this.options = options
    this.interval = 1000 / options.fps
    this.now = options.now ?? (() => performance.now())
    this.setTimer = options.setTimer ?? ((run, ms) => setTimeout(run, ms))
    this.clearTimer = options.clearTimer ?? ((timer) => clearTimeout(timer as NodeJS.Timeout))
  }

  /** Whether any session has a running turn. */
  setActive(active: boolean): void {
    this.active = active
    this.sync()
  }

  /** Re-read Reduce Motion, which can change while a session runs. */
  sync(): void {
    const animate = this.active && !this.options.reducedMotion()

    if (animate && this.timer === undefined) this.start()
    else if (!animate && this.timer !== undefined) this.stop()
  }

  get running(): boolean {
    return this.timer !== undefined
  }

  private start(): void {
    this.frames ??= this.options.load()
    const frames = this.frames

    if (frames.length < 2) return
    this.startedAt = this.now()
    this.tick(frames)
  }

  private stop(): void {
    this.clearTimer(this.timer)
    this.timer = undefined
    if (this.frames?.length) this.show(this.frames[0])
  }

  // Each tick shows the frame the wall clock is on and is scheduled against the start time,
  // so a late tick skips ahead instead of slowing the loop down.
  private tick(frames: readonly Frame[]): void {
    const step = Math.floor((this.now() - this.startedAt) / this.interval)

    this.show(frames[step % frames.length])
    const next = this.startedAt + (step + 1) * this.interval

    this.timer = this.setTimer(() => this.tick(frames), Math.max(0, next - this.now()))
  }

  private show(frame: Frame): void {
    if (frame === this.shown) return
    this.shown = frame
    this.options.setIcon(frame)
  }
}

/** Frame order from the manifest written beside the PNGs: `sequence` indexes into `files`. */
export function parseDockFrameManifest(value: unknown): {
  fps: number
  files: string[]
  sequence: number[]
} {
  const manifest = value as { fps?: unknown; files?: unknown; sequence?: unknown }
  const { fps, files, sequence } = manifest

  if (
    typeof fps !== 'number' ||
    fps <= 0 ||
    !Array.isArray(files) ||
    !files.every((file) => typeof file === 'string' && /^[\w.-]+\.png$/.test(file)) ||
    !Array.isArray(sequence) ||
    !sequence.every((i) => Number.isInteger(i) && i >= 0 && i < files.length)
  ) {
    throw new Error('invalid dock frame manifest')
  }

  return { fps, files: files as string[], sequence: sequence as number[] }
}

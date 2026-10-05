import type { UpdateMode, UpdateState } from '@shared/ipc'

/**
 * The slice of electron-updater's AppUpdater this controller drives. Kept narrow
 * so the logic is testable without Electron.
 */
export interface UpdaterPort {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  checkForUpdates(): Promise<unknown>
  downloadUpdate(): Promise<unknown>
  quitAndInstall(): void
  on(event: string, listener: (...args: any[]) => void): unknown
}

export interface UpdatePrefsStore {
  load(): UpdateMode | null
  save(mode: UpdateMode): void
}

export interface UpdateControllerOptions {
  /** null when this build can't self-update (dev, portable). */
  updater: UpdaterPort | null
  unsupportedReason?: string
  currentVersion: string
  releasesUrl: string
  prefs: UpdatePrefsStore
  onChange: (state: UpdateState) => void
  /** Called right before each network check, so the egress log stays truthful. */
  onCheck?: () => void
  now?: () => string
  timers?: {
    setTimeout: (fn: () => void, ms: number) => unknown
    setInterval: (fn: () => void, ms: number) => unknown
    clear: (handle: unknown) => void
  }
}

export const DEFAULT_UPDATE_MODE: UpdateMode = 'auto'
export const STARTUP_CHECK_DELAY_MS = 15_000
export const AUTO_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

/** electron-updater errors can carry whole HTTP bodies; keep the first line, bounded. */
export function shortError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  const first = msg.split('\n')[0].trim() || 'Update failed'
  // GitHub answers 404 for both "no release yet" and "repo not public".
  if (/^(HttpError:\s*)?404\b/.test(first)) return 'No published release found yet.'
  if (/ENOTFOUND|ENETUNREACH|ECONNREFUSED|ETIMEDOUT|ERR_INTERNET_DISCONNECTED/.test(first)) return 'You appear to be offline.'
  return first.length > 200 ? `${first.slice(0, 197)}…` : first
}

/**
 * Owns the update lifecycle for both modes:
 *  - auto:   check shortly after launch and every few hours, download in the
 *            background, install on quit (or immediately via install()).
 *  - manual: never touches the network until the user clicks "Check"; downloads
 *            only when the user clicks "Download".
 */
export class UpdateController {
  private s: UpdateState
  private readonly timers: NonNullable<UpdateControllerOptions['timers']>
  private readonly now: () => string
  private startupHandle: unknown = null
  private intervalHandle: unknown = null

  constructor(private readonly opts: UpdateControllerOptions) {
    this.now = opts.now ?? (() => new Date().toISOString())
    this.timers = opts.timers ?? {
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      setInterval: (fn, ms) => setInterval(fn, ms),
      clear: (h) => {
        clearTimeout(h as ReturnType<typeof setTimeout>)
        clearInterval(h as ReturnType<typeof setInterval>)
      },
    }
    this.s = {
      mode: opts.prefs.load() ?? DEFAULT_UPDATE_MODE,
      phase: 'idle',
      currentVersion: opts.currentVersion,
      supported: opts.updater !== null,
      unsupportedReason: opts.updater ? undefined : opts.unsupportedReason,
      releasesUrl: opts.releasesUrl,
    }

    const u = opts.updater
    if (!u) return
    u.autoDownload = this.s.mode === 'auto'
    u.autoInstallOnAppQuit = true
    u.on('checking-for-update', () => this.patch({ phase: 'checking', error: undefined }))
    u.on('update-available', (info: { version: string }) =>
      this.patch({
        phase: u.autoDownload ? 'downloading' : 'available',
        availableVersion: info.version,
        percent: u.autoDownload ? 0 : undefined,
      }),
    )
    u.on('update-not-available', () => this.patch({ phase: 'up-to-date', availableVersion: undefined }))
    u.on('download-progress', (p: { percent: number }) =>
      this.patch({ phase: 'downloading', percent: Math.max(0, Math.min(100, Math.round(p.percent))) }),
    )
    u.on('update-downloaded', (info: { version: string }) =>
      this.patch({ phase: 'ready', availableVersion: info.version, percent: 100 }),
    )
    u.on('error', (err: unknown) => this.fail(err))
  }

  state(): UpdateState {
    return { ...this.s }
  }

  /** Begin background scheduling (auto mode only). Call once after the app is ready. */
  start(): void {
    this.schedule()
  }

  dispose(): void {
    this.unschedule()
  }

  setMode(mode: UpdateMode): UpdateState {
    if (mode !== 'auto' && mode !== 'manual') return this.state()
    this.opts.prefs.save(mode)
    this.patch({ mode })
    if (!this.opts.updater) return this.state()
    this.opts.updater.autoDownload = mode === 'auto'
    this.schedule()
    // Switching to auto with an update already found: just go get it.
    if (mode === 'auto' && this.s.phase === 'available') void this.download()
    return this.state()
  }

  async check(): Promise<UpdateState> {
    const u = this.opts.updater
    if (!u) return this.state()
    // Already have (or are fetching) an update — a re-check would only reset progress.
    if (this.s.phase === 'checking' || this.s.phase === 'downloading' || this.s.phase === 'ready') return this.state()
    this.opts.onCheck?.()
    this.patch({ phase: 'checking', error: undefined, lastCheckedAt: this.now() })
    try {
      await u.checkForUpdates()
    } catch (err) {
      this.fail(err)
    }
    return this.state()
  }

  async download(): Promise<UpdateState> {
    const u = this.opts.updater
    if (!u || this.s.phase !== 'available') return this.state()
    this.patch({ phase: 'downloading', percent: 0 })
    try {
      await u.downloadUpdate()
    } catch (err) {
      this.fail(err)
    }
    return this.state()
  }

  install(): void {
    if (this.opts.updater && this.s.phase === 'ready') this.opts.updater.quitAndInstall()
  }

  private schedule(): void {
    this.unschedule()
    if (!this.opts.updater || this.s.mode !== 'auto') return
    this.startupHandle = this.timers.setTimeout(() => void this.check(), STARTUP_CHECK_DELAY_MS)
    this.intervalHandle = this.timers.setInterval(() => void this.check(), AUTO_CHECK_INTERVAL_MS)
  }

  private unschedule(): void {
    if (this.startupHandle !== null) this.timers.clear(this.startupHandle)
    if (this.intervalHandle !== null) this.timers.clear(this.intervalHandle)
    this.startupHandle = this.intervalHandle = null
  }

  private fail(err: unknown): void {
    this.patch({ phase: 'error', error: shortError(err), percent: undefined })
  }

  private patch(p: Partial<UpdateState>): void {
    this.s = { ...this.s, ...p }
    this.opts.onChange(this.state())
  }
}

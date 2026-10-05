import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import type { UpdateMode, UpdateState } from '@shared/ipc'
import { AUTO_CHECK_INTERVAL_MS, STARTUP_CHECK_DELAY_MS, UpdateController, shortError, type UpdaterPort } from './updateController'

class FakeUpdater extends EventEmitter implements UpdaterPort {
  autoDownload = true
  autoInstallOnAppQuit = false
  checks = 0
  downloads = 0
  installs = 0
  checkImpl: () => Promise<unknown> = async () => undefined
  checkForUpdates() {
    this.checks++
    return this.checkImpl()
  }
  async downloadUpdate() {
    this.downloads++
  }
  quitAndInstall() {
    this.installs++
  }
}

function fakeTimers() {
  const pending: { fn: () => void; ms: number; kind: 'timeout' | 'interval'; live: boolean }[] = []
  return {
    pending,
    live: () => pending.filter((p) => p.live),
    timers: {
      setTimeout: (fn: () => void, ms: number) => {
        const h = { fn, ms, kind: 'timeout' as const, live: true }
        pending.push(h)
        return h
      },
      setInterval: (fn: () => void, ms: number) => {
        const h = { fn, ms, kind: 'interval' as const, live: true }
        pending.push(h)
        return h
      },
      clear: (h: unknown) => {
        ;(h as { live: boolean }).live = false
      },
    },
  }
}

function setup(opts: { mode?: UpdateMode | null; updater?: FakeUpdater | null } = {}) {
  const updater = opts.updater === undefined ? new FakeUpdater() : opts.updater
  let stored: UpdateMode | null = opts.mode ?? null
  const changes: UpdateState[] = []
  const onCheck = vi.fn()
  const t = fakeTimers()
  const c = new UpdateController({
    updater,
    unsupportedReason: 'dev build',
    currentVersion: '0.1.0',
    releasesUrl: 'https://example.test/releases',
    prefs: { load: () => stored, save: (m) => (stored = m) },
    onChange: (s) => changes.push(s),
    onCheck,
    now: () => '2026-10-05T00:00:00.000Z',
    timers: t.timers,
  })
  return { c, updater: updater as FakeUpdater, changes, onCheck, t, stored: () => stored }
}

describe('UpdateController', () => {
  it('defaults to auto mode and schedules a startup check plus a periodic one', () => {
    const { c, updater, t } = setup()
    c.start()
    expect(c.state().mode).toBe('auto')
    expect(updater.autoDownload).toBe(true)
    expect(updater.autoInstallOnAppQuit).toBe(true)
    expect(t.live().map((p) => [p.kind, p.ms])).toEqual([
      ['timeout', STARTUP_CHECK_DELAY_MS],
      ['interval', AUTO_CHECK_INTERVAL_MS],
    ])
  })

  it('manual mode never schedules background checks and does not auto-download', () => {
    const { c, updater, t } = setup({ mode: 'manual' })
    c.start()
    expect(updater.autoDownload).toBe(false)
    expect(t.live()).toHaveLength(0)
  })

  it('switching modes persists the choice and (re)schedules', () => {
    const s = setup()
    s.c.start()
    s.c.setMode('manual')
    expect(s.stored()).toBe('manual')
    expect(s.updater.autoDownload).toBe(false)
    expect(s.t.live()).toHaveLength(0)
    s.c.setMode('auto')
    expect(s.stored()).toBe('auto')
    expect(s.t.live()).toHaveLength(2)
  })

  it('ignores garbage modes from the renderer', () => {
    const s = setup()
    s.c.setMode('sometimes' as UpdateMode)
    expect(s.stored()).toBeNull()
    expect(s.c.state().mode).toBe('auto')
  })

  it('manual flow: check → available → download → progress → ready → install', async () => {
    const s = setup({ mode: 'manual' })
    s.updater.checkImpl = async () => {
      s.updater.emit('checking-for-update')
      s.updater.emit('update-available', { version: '0.2.0' })
    }
    await s.c.check()
    expect(s.onCheck).toHaveBeenCalledOnce()
    expect(s.c.state()).toMatchObject({ phase: 'available', availableVersion: '0.2.0', lastCheckedAt: '2026-10-05T00:00:00.000Z' })
    expect(s.updater.downloads).toBe(0)

    await s.c.download()
    expect(s.updater.downloads).toBe(1)
    s.updater.emit('download-progress', { percent: 41.6 })
    expect(s.c.state()).toMatchObject({ phase: 'downloading', percent: 42 })
    s.updater.emit('update-downloaded', { version: '0.2.0' })
    expect(s.c.state().phase).toBe('ready')

    s.c.install()
    expect(s.updater.installs).toBe(1)
  })

  it('auto flow goes straight to downloading when an update is found', async () => {
    const s = setup()
    s.updater.checkImpl = async () => {
      s.updater.emit('update-available', { version: '0.2.0' })
    }
    await s.c.check()
    expect(s.c.state()).toMatchObject({ phase: 'downloading', percent: 0 })
  })

  it('the scheduled startup check actually checks', async () => {
    const s = setup()
    s.c.start()
    s.t.live()[0].fn()
    await Promise.resolve()
    expect(s.updater.checks).toBe(1)
  })

  it('reports up-to-date', async () => {
    const s = setup()
    s.updater.checkImpl = async () => {
      s.updater.emit('update-not-available', { version: '0.1.0' })
    }
    await s.c.check()
    expect(s.c.state().phase).toBe('up-to-date')
  })

  it('surfaces a short error when the check rejects', async () => {
    const s = setup()
    s.updater.checkImpl = async () => {
      throw new Error('HttpError: 404\n<html>very long body</html>')
    }
    await s.c.check()
    expect(s.c.state()).toMatchObject({ phase: 'error', error: 'No published release found yet.' })
  })

  it('does not re-check while a download is in flight or ready', async () => {
    const s = setup()
    s.updater.emit('update-downloaded', { version: '0.2.0' })
    await s.c.check()
    expect(s.updater.checks).toBe(0)
  })

  it('download/install are no-ops in the wrong phase', async () => {
    const s = setup()
    await s.c.download()
    s.c.install()
    expect(s.updater.downloads).toBe(0)
    expect(s.updater.installs).toBe(0)
  })

  it('switching to auto with an update waiting starts the download', async () => {
    const s = setup({ mode: 'manual' })
    s.updater.emit('update-available', { version: '0.2.0' })
    s.c.setMode('auto')
    await Promise.resolve()
    expect(s.updater.downloads).toBe(1)
  })

  it('unsupported builds report why and never touch the network', async () => {
    const s = setup({ updater: null })
    s.c.start()
    await s.c.check()
    expect(s.c.state()).toMatchObject({ supported: false, unsupportedReason: 'dev build', phase: 'idle' })
    expect(s.onCheck).not.toHaveBeenCalled()
    expect(s.t.live()).toHaveLength(0)
    // The preference is still remembered for when they install a real build.
    s.c.setMode('manual')
    expect(s.stored()).toBe('manual')
  })
})

describe('shortError', () => {
  it('keeps the first line and bounds length', () => {
    expect(shortError(new Error('a\nb'))).toBe('a')
    expect(shortError('x'.repeat(500))).toHaveLength(198)
    expect(shortError(new Error(''))).toBe('Update failed')
    expect(shortError(new Error('404'))).toBe('No published release found yet.')
    expect(shortError(new Error('net::ERR_INTERNET_DISCONNECTED'))).toBe('You appear to be offline.')
  })
})

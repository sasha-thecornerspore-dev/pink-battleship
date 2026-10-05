import { app, BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { IPC, type UpdateMode } from '@shared/ipc'
import { RELEASES_URL } from '@shared/release'
import { UpdateController, type UpdatePrefsStore, type UpdaterPort } from '@core/updates/updateController'

/**
 * The update preference lives outside the encrypted vault on purpose: the
 * updater runs before (and regardless of) unlock, and the value isn't sensitive.
 */
function prefsStore(): UpdatePrefsStore {
  const file = join(app.getPath('userData'), 'update-prefs.json')
  return {
    load() {
      try {
        const mode = JSON.parse(readFileSync(file, 'utf8')).mode
        return mode === 'auto' || mode === 'manual' ? (mode as UpdateMode) : null
      } catch {
        return null
      }
    },
    save(mode) {
      try {
        writeFileSync(file, JSON.stringify({ mode }))
      } catch {
        /* read-only profile — the choice still applies for this session */
      }
    },
  }
}

function unsupportedReason(): string | null {
  if (!app.isPackaged) return 'This is a development build — updates run in the installed app.'
  if (process.env.PORTABLE_EXECUTABLE_DIR) return 'The portable build can’t update itself. Grab the latest from the releases page, or use the installer for automatic updates.'
  return null
}

/**
 * Wires electron-updater (GitHub Releases feed) to the UpdateController. In
 * auto mode it checks ~15s after launch and every 6h; in manual mode it never
 * touches the network until the user clicks "Check for updates".
 */
export function createUpdates(opts: { onCheck?: () => void } = {}): UpdateController {
  const reason = unsupportedReason()
  const updater = reason ? null : (electronUpdater.autoUpdater as unknown as UpdaterPort)
  if (updater) electronUpdater.autoUpdater.logger = null

  return new UpdateController({
    updater,
    unsupportedReason: reason ?? undefined,
    currentVersion: app.getVersion(),
    releasesUrl: RELEASES_URL,
    prefs: prefsStore(),
    onCheck: opts.onCheck,
    onChange: (state) => {
      for (const w of BrowserWindow.getAllWindows()) {
        if (!w.isDestroyed()) w.webContents.send(IPC.updatesChanged, state)
      }
    },
  })
}

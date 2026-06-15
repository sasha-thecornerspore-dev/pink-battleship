import { app } from 'electron'
import electronUpdater from 'electron-updater'

/**
 * Auto-update from GitHub Releases. No-ops in dev — only signed, packaged builds
 * can verify and silently apply updates. Failures are swallowed (never block the app).
 */
export function initAutoUpdate(): void {
  if (!app.isPackaged) return
  const { autoUpdater } = electronUpdater
  autoUpdater.autoDownload = true
  autoUpdater.checkForUpdatesAndNotify().catch(() => {
    /* offline or no release yet — ignore */
  })
}

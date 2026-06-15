import { ipcMain } from 'electron'
import { IPC, type ImportCsvRequest, type ThemePref } from '@shared/ipc'
import type { RateRule } from '@shared/models'
import type { AppServices } from './services'

export function registerIpc(services: AppServices): void {
  ipcMain.handle(IPC.vaultStatus, () => services.status())
  ipcMain.handle(IPC.vaultSetup, (_e, passphrase: string) => services.setup(passphrase))
  ipcMain.handle(IPC.vaultUnlock, (_e, passphrase: string) => ({ ok: services.unlock(passphrase) }))
  ipcMain.handle(IPC.vaultLock, () => services.lock())

  ipcMain.handle(IPC.connectorsList, () => services.listConnectors())
  ipcMain.handle(IPC.connectorsConnectChaturbateMock, () => services.connectChaturbateMock())
  ipcMain.handle(IPC.connectorsSync, (_e, connectorId: string) => services.syncConnector(connectorId))

  ipcMain.handle(IPC.importCsv, (_e, req: ImportCsvRequest) => services.importCsv(req))

  ipcMain.handle(IPC.pnlSummary, () => services.pnlSummary())

  ipcMain.handle(IPC.ratesList, () => services.listRates())
  ipcMain.handle(IPC.ratesUpsert, (_e, rule: RateRule) => services.upsertRate(rule))

  ipcMain.handle(IPC.settingsGetTheme, () => services.getTheme())
  ipcMain.handle(IPC.settingsSetTheme, (_e, pref: ThemePref) => services.setTheme(pref))

  ipcMain.handle(IPC.privacyDataFlows, () => services.privacyReport())

  ipcMain.handle(IPC.fansList, () => services.listFans())
  ipcMain.handle(IPC.fansSetNote, (_e, fanId: string, note: string) => services.setFanNote(fanId, note))

  ipcMain.handle(IPC.statsReport, () => services.statsReport())
}

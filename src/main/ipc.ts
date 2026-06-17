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
  ipcMain.handle(IPC.connectorsConnectChaturbate, (_e, eventsUrl: string) => services.connectChaturbate(eventsUrl))
  ipcMain.handle(IPC.connectorsSync, (_e, connectorId: string) => services.syncConnector(connectorId))
  ipcMain.handle(IPC.connectorsDisconnect, (_e, connectorId: string) => services.disconnectConnector(connectorId))

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

  ipcMain.handle(IPC.galleriesList, () => services.listGalleries())
  ipcMain.handle(IPC.galleriesCreateSet, (_e, name: string) => services.createGallerySet(name))
  ipcMain.handle(IPC.galleriesAssets, (_e, galleryId: string) => services.listAssets(galleryId))
  ipcMain.handle(IPC.assetsSetTags, (_e, assetId: string, tags: string[]) => services.setAssetTags(assetId, tags))
  ipcMain.handle(IPC.assetsTogglePosted, (_e, assetId: string, platformId: string) => services.toggleAssetPosted(assetId, platformId))

  ipcMain.handle(IPC.assistantDraft, (_e, req) => services.draftAssistant(req))
  ipcMain.handle(IPC.assistantConfig, () => services.assistantConfig())
  ipcMain.handle(IPC.assistantSetBoundaries, (_e, boundaries: string[]) => services.setAssistantBoundaries(boundaries))
  ipcMain.handle(IPC.assistantSetKey, (_e, provider: string, key: string) => services.setAssistantKey(provider, key))
  ipcMain.handle(IPC.assistantOllama, () => services.ollamaStatus())
  ipcMain.handle(IPC.assistantSetLocalModel, (_e, model: string) => services.setLocalModel(model))

  ipcMain.handle(IPC.scheduleList, () => services.listSchedule())
  ipcMain.handle(IPC.scheduleCreate, (_e, input) => services.createSchedule(input))
  ipcMain.handle(IPC.scheduleSetStatus, (_e, id: string, status) => services.setScheduleStatus(id, status))
  ipcMain.handle(IPC.scheduleRemove, (_e, id: string) => services.removeSchedule(id))

  ipcMain.handle(IPC.complianceOverview, () => services.complianceOverview())
  ipcMain.handle(IPC.complianceAddRecord, (_e, input) => services.addComplianceRecord(input))
  ipcMain.handle(IPC.complianceRemoveRecord, (_e, id: string) => services.removeComplianceRecord(id))
  ipcMain.handle(IPC.complianceSetCustodian, (_e, info) => services.setCustodian(info))
  ipcMain.handle(IPC.complianceDmca, (_e, input) => services.dmcaNotice(input))
}

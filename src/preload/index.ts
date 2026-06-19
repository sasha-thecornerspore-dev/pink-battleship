import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type PbApiContract } from '../shared/ipc'

const api: PbApiContract = {
  vault: {
    status: () => ipcRenderer.invoke(IPC.vaultStatus),
    setup: (passphrase) => ipcRenderer.invoke(IPC.vaultSetup, passphrase),
    unlock: (passphrase) => ipcRenderer.invoke(IPC.vaultUnlock, passphrase),
    lock: () => ipcRenderer.invoke(IPC.vaultLock),
  },
  connectors: {
    list: () => ipcRenderer.invoke(IPC.connectorsList),
    connectChaturbateMock: () => ipcRenderer.invoke(IPC.connectorsConnectChaturbateMock),
    connectChaturbate: (eventsUrl) => ipcRenderer.invoke(IPC.connectorsConnectChaturbate, eventsUrl),
    sync: (connectorId) => ipcRenderer.invoke(IPC.connectorsSync, connectorId),
    disconnect: (connectorId) => ipcRenderer.invoke(IPC.connectorsDisconnect, connectorId),
  },
  imports: {
    csv: (req) => ipcRenderer.invoke(IPC.importCsv, req),
  },
  pnl: {
    summary: () => ipcRenderer.invoke(IPC.pnlSummary),
  },
  rates: {
    list: () => ipcRenderer.invoke(IPC.ratesList),
    upsert: (rule) => ipcRenderer.invoke(IPC.ratesUpsert, rule),
  },
  settings: {
    getTheme: () => ipcRenderer.invoke(IPC.settingsGetTheme),
    setTheme: (pref) => ipcRenderer.invoke(IPC.settingsSetTheme, pref),
  },
  privacy: {
    dataFlows: () => ipcRenderer.invoke(IPC.privacyDataFlows),
  },
  fans: {
    list: () => ipcRenderer.invoke(IPC.fansList),
    setNote: (fanId, note) => ipcRenderer.invoke(IPC.fansSetNote, fanId, note),
    detail: (fanId) => ipcRenderer.invoke(IPC.fansDetail, fanId),
  },
  stats: {
    report: () => ipcRenderer.invoke(IPC.statsReport),
  },
  galleries: {
    list: () => ipcRenderer.invoke(IPC.galleriesList),
    createSet: (name) => ipcRenderer.invoke(IPC.galleriesCreateSet, name),
    assets: (galleryId) => ipcRenderer.invoke(IPC.galleriesAssets, galleryId),
    setTags: (assetId, tags) => ipcRenderer.invoke(IPC.assetsSetTags, assetId, tags),
    togglePosted: (assetId, platformId) => ipcRenderer.invoke(IPC.assetsTogglePosted, assetId, platformId),
    importFiles: (galleryId) => ipcRenderer.invoke(IPC.galleriesImport, galleryId),
  },
  assistant: {
    draft: (req) => ipcRenderer.invoke(IPC.assistantDraft, req),
    config: () => ipcRenderer.invoke(IPC.assistantConfig),
    setBoundaries: (boundaries) => ipcRenderer.invoke(IPC.assistantSetBoundaries, boundaries),
    setKey: (provider, key) => ipcRenderer.invoke(IPC.assistantSetKey, provider, key),
    ollama: () => ipcRenderer.invoke(IPC.assistantOllama),
    setLocalModel: (model) => ipcRenderer.invoke(IPC.assistantSetLocalModel, model),
    setModel: (provider, model) => ipcRenderer.invoke(IPC.assistantSetModel, provider, model),
  },
  schedule: {
    list: () => ipcRenderer.invoke(IPC.scheduleList),
    create: (input) => ipcRenderer.invoke(IPC.scheduleCreate, input),
    setStatus: (id, status) => ipcRenderer.invoke(IPC.scheduleSetStatus, id, status),
    remove: (id) => ipcRenderer.invoke(IPC.scheduleRemove, id),
  },
  compliance: {
    overview: () => ipcRenderer.invoke(IPC.complianceOverview),
    addRecord: (input) => ipcRenderer.invoke(IPC.complianceAddRecord, input),
    removeRecord: (id) => ipcRenderer.invoke(IPC.complianceRemoveRecord, id),
    setCustodian: (info) => ipcRenderer.invoke(IPC.complianceSetCustodian, info),
    dmca: (input) => ipcRenderer.invoke(IPC.complianceDmca, input),
  },
  obs: {
    status: () => ipcRenderer.invoke(IPC.obsStatus),
    connect: (address, password) => ipcRenderer.invoke(IPC.obsConnect, address, password),
    disconnect: () => ipcRenderer.invoke(IPC.obsDisconnect),
  },
  website: {
    getConfig: () => ipcRenderer.invoke(IPC.websiteGetConfig),
    save: (config) => ipcRenderer.invoke(IPC.websiteSave, config),
    export: (config) => ipcRenderer.invoke(IPC.websiteExport, config),
  },
  system: {
    openExternal: (url) => ipcRenderer.invoke(IPC.systemOpenExternal, url),
  },
  backup: {
    export: (password) => ipcRenderer.invoke(IPC.backupExport, password),
    restore: (password) => ipcRenderer.invoke(IPC.backupRestore, password),
  },
  checkout: {
    listPaid: () => ipcRenderer.invoke(IPC.checkoutListPaid),
    setPaid: (galleryId, config) => ipcRenderer.invoke(IPC.checkoutSetPaid, galleryId, config),
    listSales: () => ipcRenderer.invoke(IPC.checkoutListSales),
    listIntents: () => ipcRenderer.invoke(IPC.checkoutListIntents),
    vamp: () => ipcRenderer.invoke(IPC.checkoutVamp),
    simulateSale: (galleryId) => ipcRenderer.invoke(IPC.checkoutSimulateSale, galleryId),
    dispute: (saleId, type) => ipcRenderer.invoke(IPC.checkoutDispute, saleId, type),
    exportEvidence: (saleId) => ipcRenderer.invoke(IPC.checkoutExportEvidence, saleId),
  },
}

contextBridge.exposeInMainWorld('pb', api)

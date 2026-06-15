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
    sync: (connectorId) => ipcRenderer.invoke(IPC.connectorsSync, connectorId),
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
  },
  stats: {
    report: () => ipcRenderer.invoke(IPC.statsReport),
  },
}

contextBridge.exposeInMainWorld('pb', api)

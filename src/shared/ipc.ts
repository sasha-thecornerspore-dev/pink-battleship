import type { ConnectorInfo, EgressEntry, Fan, PnlSummary, RateRule, ThemeId, ThemeMode } from './models'

export type VaultStatus = 'uninitialized' | 'locked' | 'unlocked'

export interface ImportCsvRequest {
  platformId: string
  csv: string
  map: { date: string; amount: string; kind?: string; payer?: string; currency?: string }
}

export interface ImportCsvResult {
  inserted: number
  skipped: { line: number; reason: string }[]
}

export interface ThemePref {
  theme: ThemeId
  mode: ThemeMode
}

export interface PrivacyReport {
  declared: { connectorId: string; platformId: string; driver: string; dataFlows: string[] }[]
  log: EgressEntry[]
}

/** The complete, typed surface exposed on `window.pb`. Preload implements it; renderer consumes it. */
export interface PbApiContract {
  vault: {
    status(): Promise<VaultStatus>
    setup(passphrase: string): Promise<VaultStatus>
    unlock(passphrase: string): Promise<{ ok: boolean }>
    lock(): Promise<void>
  }
  connectors: {
    list(): Promise<ConnectorInfo[]>
    connectChaturbateMock(): Promise<ConnectorInfo>
    sync(connectorId: string): Promise<{ inserted: number }>
  }
  imports: {
    csv(req: ImportCsvRequest): Promise<ImportCsvResult>
  }
  pnl: {
    summary(): Promise<PnlSummary>
  }
  rates: {
    list(): Promise<RateRule[]>
    upsert(rule: RateRule): Promise<void>
  }
  settings: {
    getTheme(): Promise<ThemePref>
    setTheme(pref: ThemePref): Promise<void>
  }
  privacy: {
    dataFlows(): Promise<PrivacyReport>
  }
  fans: {
    list(): Promise<Fan[]>
    setNote(fanId: string, note: string): Promise<void>
  }
}

export const IPC = {
  vaultStatus: 'vault:status',
  vaultSetup: 'vault:setup',
  vaultUnlock: 'vault:unlock',
  vaultLock: 'vault:lock',
  connectorsList: 'connectors:list',
  connectorsConnectChaturbateMock: 'connectors:connect-chaturbate-mock',
  connectorsSync: 'connectors:sync',
  importCsv: 'import:csv',
  pnlSummary: 'pnl:summary',
  ratesList: 'rates:list',
  ratesUpsert: 'rates:upsert',
  settingsGetTheme: 'settings:get-theme',
  settingsSetTheme: 'settings:set-theme',
  privacyDataFlows: 'privacy:data-flows',
  fansList: 'fans:list',
  fansSetNote: 'fans:set-note',
} as const

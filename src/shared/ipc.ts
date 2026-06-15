import type { Asset, AssistantProvider, ComplianceOverview, ConnectorInfo, DmcaInput, DraftRequest, DraftResult, EgressEntry, Fan, Gallery, PnlSummary, RateRule, ScheduledItem, ScheduleStatus, StatsReport, ThemeId, ThemeMode, TwoFiveSevenRecord } from './models'

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
    connectChaturbate(eventsUrl: string): Promise<ConnectorInfo>
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
  stats: {
    report(): Promise<StatsReport>
  }
  galleries: {
    list(): Promise<Gallery[]>
    createSet(name: string): Promise<Gallery>
    assets(galleryId: string): Promise<Asset[]>
    setTags(assetId: string, tags: string[]): Promise<void>
    togglePosted(assetId: string, platformId: string): Promise<void>
  }
  assistant: {
    draft(req: DraftRequest): Promise<DraftResult>
    config(): Promise<{ boundaries: string[]; providers: AssistantProvider[]; available: string[] }>
    setBoundaries(boundaries: string[]): Promise<void>
  }
  schedule: {
    list(): Promise<ScheduledItem[]>
    create(input: Omit<ScheduledItem, 'id' | 'status'>): Promise<ScheduledItem>
    setStatus(id: string, status: ScheduleStatus): Promise<void>
    remove(id: string): Promise<void>
  }
  compliance: {
    overview(): Promise<ComplianceOverview>
    addRecord(input: Omit<TwoFiveSevenRecord, 'id' | 'addedAt'>): Promise<TwoFiveSevenRecord>
    removeRecord(id: string): Promise<void>
    setCustodian(info: { name: string; address: string }): Promise<void>
    dmca(input: DmcaInput): Promise<string>
  }
}

export const IPC = {
  vaultStatus: 'vault:status',
  vaultSetup: 'vault:setup',
  vaultUnlock: 'vault:unlock',
  vaultLock: 'vault:lock',
  connectorsList: 'connectors:list',
  connectorsConnectChaturbateMock: 'connectors:connect-chaturbate-mock',
  connectorsConnectChaturbate: 'connectors:connect-chaturbate',
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
  statsReport: 'stats:report',
  galleriesList: 'galleries:list',
  galleriesCreateSet: 'galleries:create-set',
  galleriesAssets: 'galleries:assets',
  assetsSetTags: 'assets:set-tags',
  assetsTogglePosted: 'assets:toggle-posted',
  assistantDraft: 'assistant:draft',
  assistantConfig: 'assistant:config',
  assistantSetBoundaries: 'assistant:set-boundaries',
  scheduleList: 'schedule:list',
  scheduleCreate: 'schedule:create',
  scheduleSetStatus: 'schedule:set-status',
  scheduleRemove: 'schedule:remove',
  complianceOverview: 'compliance:overview',
  complianceAddRecord: 'compliance:add-record',
  complianceRemoveRecord: 'compliance:remove-record',
  complianceSetCustodian: 'compliance:set-custodian',
  complianceDmca: 'compliance:dmca',
} as const

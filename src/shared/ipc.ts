import type { Asset, AssistantConfigResult, ComplianceOverview, ConnectorInfo, DmcaInput, DraftRequest, DraftResult, EgressEntry, Fan, Gallery, ObsStatus, PnlSummary, RateRule, ScheduledItem, ScheduleStatus, SiteConfig, StatsReport, ThemeId, ThemeMode, TwoFiveSevenRecord } from './models'

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
    disconnect(connectorId: string): Promise<void>
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
    importFiles(galleryId: string): Promise<{ added: number; skipped: number }>
  }
  assistant: {
    draft(req: DraftRequest): Promise<DraftResult>
    config(): Promise<AssistantConfigResult>
    setBoundaries(boundaries: string[]): Promise<void>
    setKey(provider: string, key: string): Promise<void>
    ollama(): Promise<{ running: boolean; models: string[] }>
    setLocalModel(model: string): Promise<void>
    setModel(provider: string, model: string): Promise<void>
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
  obs: {
    status(): Promise<ObsStatus>
    connect(address: string, password: string): Promise<ObsStatus>
    disconnect(): Promise<void>
  }
  website: {
    getConfig(): Promise<SiteConfig>
    save(config: SiteConfig): Promise<void>
    export(config: SiteConfig): Promise<string | null>
  }
  system: {
    openExternal(url: string): Promise<void>
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
  connectorsDisconnect: 'connectors:disconnect',
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
  galleriesImport: 'galleries:import',
  assistantDraft: 'assistant:draft',
  assistantConfig: 'assistant:config',
  assistantSetBoundaries: 'assistant:set-boundaries',
  assistantSetKey: 'assistant:set-key',
  assistantOllama: 'assistant:ollama',
  assistantSetLocalModel: 'assistant:set-local-model',
  assistantSetModel: 'assistant:set-model',
  scheduleList: 'schedule:list',
  scheduleCreate: 'schedule:create',
  scheduleSetStatus: 'schedule:set-status',
  scheduleRemove: 'schedule:remove',
  complianceOverview: 'compliance:overview',
  complianceAddRecord: 'compliance:add-record',
  complianceRemoveRecord: 'compliance:remove-record',
  complianceSetCustodian: 'compliance:set-custodian',
  complianceDmca: 'compliance:dmca',
  obsStatus: 'obs:status',
  obsConnect: 'obs:connect',
  obsDisconnect: 'obs:disconnect',
  websiteGetConfig: 'website:get-config',
  websiteSave: 'website:save',
  websiteExport: 'website:export',
  systemOpenExternal: 'system:open-external',
} as const

import type { Asset, AssistantConfigResult, CheckoutIntent, ComplianceOverview, ConnectorInfo, DmcaInput, DraftRequest, DraftResult, EgressEntry, Fan, FanDetail, Gallery, ObsStatus, PaidConfig, PnlSummary, RateRule, Sale, ScheduledItem, ScheduleStatus, SiteConfig, StatsReport, ThemeId, ThemeMode, TwoFiveSevenRecord, VampStats } from './models'

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

/** `auto` checks in the background and downloads on its own; `manual` only checks when asked. */
export type UpdateMode = 'auto' | 'manual'

export type UpdatePhase = 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'ready' | 'error'

export interface UpdateState {
  mode: UpdateMode
  phase: UpdatePhase
  currentVersion: string
  /** False in dev and portable builds — those can't replace themselves; point at the releases page instead. */
  supported: boolean
  unsupportedReason?: string
  availableVersion?: string
  /** 0–100 while downloading. */
  percent?: number
  error?: string
  lastCheckedAt?: string
  releasesUrl: string
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
    detail(fanId: string): Promise<FanDetail | null>
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
  updates: {
    state(): Promise<UpdateState>
    setMode(mode: UpdateMode): Promise<UpdateState>
    check(): Promise<UpdateState>
    download(): Promise<UpdateState>
    /** Quits and runs the installer for a downloaded update. */
    install(): Promise<void>
    /** Subscribe to state pushes from the main process; returns an unsubscribe. */
    onChange(listener: (state: UpdateState) => void): () => void
  }
  backup: {
    export(password: string): Promise<string | null>
    restore(password: string): Promise<{ ok: boolean; error?: string; transactions?: number; connectors?: number }>
  }
  checkout: {
    listPaid(): Promise<Record<string, PaidConfig>>
    setPaid(galleryId: string, config: PaidConfig | null): Promise<void>
    listSales(): Promise<Sale[]>
    listIntents(): Promise<CheckoutIntent[]>
    vamp(): Promise<VampStats>
    simulateSale(galleryId: string): Promise<{ ok: boolean; reason?: string }>
    dispute(saleId: string, type: 'refund' | 'chargeback'): Promise<{ ok: boolean; reason?: string }>
    exportEvidence(saleId: string): Promise<string | null>
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
  fansDetail: 'fans:detail',
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
  updatesState: 'updates:state',
  updatesSetMode: 'updates:set-mode',
  updatesCheck: 'updates:check',
  updatesDownload: 'updates:download',
  updatesInstall: 'updates:install',
  updatesChanged: 'updates:changed',
  backupExport: 'backup:export',
  backupRestore: 'backup:restore',
  checkoutListPaid: 'checkout:list-paid',
  checkoutSetPaid: 'checkout:set-paid',
  checkoutListSales: 'checkout:list-sales',
  checkoutListIntents: 'checkout:list-intents',
  checkoutVamp: 'checkout:vamp',
  checkoutSimulateSale: 'checkout:simulate-sale',
  checkoutDispute: 'checkout:dispute',
  checkoutExportEvidence: 'checkout:export-evidence',
} as const

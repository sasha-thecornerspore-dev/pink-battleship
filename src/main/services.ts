import { app, dialog } from 'electron'
import { writeFileSync, readFileSync, mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { Database } from '@core/db/database'
import { SqlcipherDatabase } from '@core/db/sqlcipherDatabase'
import { SafeStorageSecretStore } from '@core/secrets/safeStorageSecretStore'
import type { SecretStore } from '@core/secrets/secretStore'
import {
  generateDbKey,
  generateSalt,
  deriveWrappingKey,
  wrapKey,
  unwrapKey,
  zeroize,
  type WrappedKey,
} from '@core/crypto/keyvault'
import { PnlService } from '@core/pnl/pnlService'
import { FanService } from '@core/fans/fanService'
import { StatsService } from '@core/stats/statsService'
import { GalleryService } from '@core/gallery/galleryService'
import { AssistantService, ALL_PROVIDERS } from '@core/assistant/assistantService'
import { PROVIDER_HTTP, composePrompt, providerModelDefaults } from '@core/assistant/providerHttp'
import { fetchObsStatus } from '@core/obs/obsClient'
import { buildSite, DEFAULT_SITE } from '@core/website/siteBuilder'
import { buildImportDrafts, isSupportedMedia, type ProbedFile } from '@core/gallery/mediaImport'
import { sealBackup, openBackup, type BackupFile } from '@core/backup/backupFile'
import { CheckoutService } from '@core/checkout/checkoutService'
import { MockProcessor } from '@core/checkout/mockProcessor'
import { createNodeMediaProbe } from './mediaProbe'
import { ScheduleService, type NewScheduledItem } from '@core/schedule/scheduleService'
import { ComplianceService, type NewRecord, type CustodianInfo } from '@core/compliance/complianceService'
import { NetworkGateway } from '@core/privacy/networkGateway'
import { ChaturbateDriver, CHATURBATE_HOST, type ChaturbateEvent } from '@core/connectors/chaturbate'
import chaturbateFixture from '@core/connectors/fixtures/chaturbate-events.json'
import { parseCsvTransactions } from '@core/connectors/manualCsv'
import { seedDefaults } from './seed'
import type { Asset, AssistantConfigResult, ComplianceOverview, ConnectorInfo, DmcaInput, DraftRequest, DraftResult, EgressEntry, Fan, Gallery, ObsStatus, PaidConfig, PnlSummary, RateRule, ScheduledItem, ScheduleStatus, SiteConfig, StatsReport, ThemeId, ThemeMode, TwoFiveSevenRecord } from '@shared/models'
import type { ImportCsvRequest, ImportCsvResult, PrivacyReport, ThemePref, VaultStatus } from '@shared/ipc'

const VAULT_SECRET_KEY = 'vault.v1'

interface VaultBlob {
  salt: string
  wrapped: WrappedKey
}

/**
 * Single composition root for the main process. Owns the vault lifecycle and
 * exposes exactly the operations the IPC layer needs. The renderer never sees
 * any of this — only the typed results.
 */
export class AppServices {
  private readonly secrets: SecretStore
  private readonly dbPath: string
  private readonly gateway: NetworkGateway
  private db: Database | null = null
  private dbKey: Buffer | null = null

  constructor() {
    this.secrets = new SafeStorageSecretStore()
    this.dbPath = join(app.getPath('userData'), 'pinkbattleship.db')
    this.gateway = new NetworkGateway(new Set([CHATURBATE_HOST]), (e) => this.onEgress(e))
  }

  private onEgress(e: EgressEntry): void {
    this.db?.appendEgress(e)
  }

  private requireDb(): Database {
    if (!this.db) throw new Error('Vault is locked')
    return this.db
  }

  private openDb(dbKey: Buffer): void {
    this.dbKey = dbKey
    this.db = new SqlcipherDatabase(this.dbPath, dbKey)
  }

  // --- vault lifecycle ---

  status(): VaultStatus {
    if (!this.secrets.get(VAULT_SECRET_KEY)) return 'uninitialized'
    return this.db ? 'unlocked' : 'locked'
  }

  setup(passphrase: string): VaultStatus {
    if (this.secrets.get(VAULT_SECRET_KEY)) return this.status()
    const dbKey = generateDbKey()
    const salt = generateSalt()
    const wrapped = wrapKey(dbKey, deriveWrappingKey(passphrase, salt))
    const blob: VaultBlob = { salt: salt.toString('base64'), wrapped }
    this.secrets.set(VAULT_SECRET_KEY, JSON.stringify(blob))
    this.openDb(dbKey)
    seedDefaults(this.requireDb())
    return 'unlocked'
  }

  unlock(passphrase: string): boolean {
    const raw = this.secrets.get(VAULT_SECRET_KEY)
    if (!raw) return false
    const blob = JSON.parse(raw) as VaultBlob
    const salt = Buffer.from(blob.salt, 'base64')
    try {
      const dbKey = unwrapKey(blob.wrapped, deriveWrappingKey(passphrase, salt))
      this.openDb(dbKey)
      seedDefaults(this.requireDb())
      return true
    } catch {
      return false
    }
  }

  lock(): void {
    this.db?.close()
    this.db = null
    if (this.dbKey) {
      zeroize(this.dbKey)
      this.dbKey = null
    }
  }

  // --- connectors ---

  listConnectors(): ConnectorInfo[] {
    return this.requireDb().listConnectors()
  }

  connectChaturbateMock(): ConnectorInfo {
    const info: ConnectorInfo = {
      id: 'chaturbate-mock',
      platformId: 'chaturbate',
      driver: 'official',
      riskLabel: 'official-low',
      status: 'needs_sync',
      lastSyncAt: null,
    }
    this.requireDb().upsertConnector(info)
    return info
  }

  connectChaturbate(eventsUrl: string): ConnectorInfo {
    this.secrets.set('chaturbate.eventsUrl', eventsUrl)
    const info: ConnectorInfo = {
      id: 'chaturbate',
      platformId: 'chaturbate',
      driver: 'official',
      riskLabel: 'official-low',
      status: 'needs_sync',
      lastSyncAt: null,
    }
    this.requireDb().upsertConnector(info)
    return info
  }

  async syncConnector(connectorId: string): Promise<{ inserted: number }> {
    const db = this.requireDb()
    const info = db.listConnectors().find((c) => c.id === connectorId)
    if (!info) throw new Error('Unknown connector')
    if (info.platformId !== 'chaturbate') return { inserted: 0 }

    const driver =
      info.id === 'chaturbate-mock'
        ? new ChaturbateDriver({ mock: true, fixture: chaturbateFixture as ChaturbateEvent[], gateway: this.gateway })
        : new ChaturbateDriver({ gateway: this.gateway, eventsUrl: this.secrets.get('chaturbate.eventsUrl') ?? undefined })

    try {
      const txs = await driver.sync({ connectorId, platformId: info.platformId })
      db.insertTransactions(txs)
      db.upsertConnector({ ...info, status: 'healthy', lastSyncAt: new Date().toISOString() })
      return { inserted: txs.length }
    } catch (err) {
      db.upsertConnector({ ...info, status: 'broken' })
      throw err
    }
  }

  disconnectConnector(connectorId: string): void {
    this.requireDb().removeConnector(connectorId)
    if (connectorId === 'chaturbate') this.secrets.delete('chaturbate.eventsUrl')
  }

  importCsv(req: ImportCsvRequest): ImportCsvResult {
    const db = this.requireDb()
    const connectorId = `manual:${req.platformId}`
    const result = parseCsvTransactions(req.csv, { platformId: req.platformId, connectorId, map: req.map })
    db.insertTransactions(result.transactions)
    if (!db.listConnectors().some((c) => c.id === connectorId)) {
      db.upsertConnector({
        id: connectorId,
        platformId: req.platformId,
        driver: 'manual',
        riskLabel: 'manual-none',
        status: 'healthy',
        lastSyncAt: new Date().toISOString(),
      })
    }
    return { inserted: result.transactions.length, skipped: result.skipped }
  }

  // --- analytics ---

  pnlSummary(): PnlSummary {
    return new PnlService(this.requireDb()).summary()
  }

  // --- fans (rolodex) ---

  listFans(): Fan[] {
    return new FanService(this.requireDb()).list()
  }

  setFanNote(fanId: string, note: string): void {
    new FanService(this.requireDb()).setNote(fanId, note)
  }
  fanDetail(fanId: string) {
    return new FanService(this.requireDb()).detail(fanId)
  }

  // --- stats ---

  statsReport(): StatsReport {
    return new StatsService(this.requireDb()).report()
  }

  // --- galleries (DAM) ---

  listGalleries(): Gallery[] {
    return new GalleryService(this.requireDb()).galleries()
  }
  createGallerySet(name: string): Gallery {
    return new GalleryService(this.requireDb()).createSet(name)
  }
  listAssets(galleryId: string): Asset[] {
    return new GalleryService(this.requireDb()).assets(galleryId)
  }
  setAssetTags(assetId: string, tags: string[]): void {
    new GalleryService(this.requireDb()).setTags(assetId, tags)
  }
  toggleAssetPosted(assetId: string, platformId: string): void {
    new GalleryService(this.requireDb()).togglePosted(assetId, platformId)
  }
  thumbDir(): string {
    return join(app.getPath('userData'), 'thumbs')
  }
  async importMedia(galleryId: string): Promise<{ added: number; skipped: number }> {
    const gallery = new GalleryService(this.requireDb())
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import media — files are referenced in place, never copied',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Media', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'heic', 'bmp', 'tiff', 'mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi'] }],
    })
    if (canceled || filePaths.length === 0) return { added: 0, skipped: 0 }

    const dir = this.thumbDir()
    mkdirSync(dir, { recursive: true })
    const probe = createNodeMediaProbe(dir)

    const probed: ProbedFile[] = []
    for (const path of filePaths) {
      if (!isSupportedMedia(path)) continue
      let sizeBytes = 0
      try {
        sizeBytes = statSync(path).size
      } catch {
        /* unreadable → size 0 */
      }
      probed.push({ path, sizeBytes, meta: await probe.probe(path) })
    }

    const existing = gallery.assets('master')
    const { drafts, skipped } = buildImportDrafts(existing, probed)
    gallery.addAssets(galleryId, drafts)
    return { added: drafts.length, skipped: skipped + (filePaths.length - probed.length) }
  }

  // --- AI assistant ---

  private assistantAvailable(): string[] {
    const keyed = ALL_PROVIDERS.filter((p) => p.needsKey && this.secrets.get(`ai.${p.id}Key`)).map((p) => p.id)
    return ['local', ...keyed]
  }
  private assistantBoundaries(): string[] {
    const raw = this.requireDb().getSetting('assistant:boundaries')
    return raw ? (JSON.parse(raw) as string[]) : []
  }
  async draftAssistant(req: DraftRequest): Promise<DraftResult> {
    const result = new AssistantService().draft(req, { boundaries: this.assistantBoundaries() }, this.assistantAvailable())
    if (!result.ok || !result.route) return result
    // Real generation. The router already chose a policy-safe backend; we just
    // call it. Every path falls back to the deterministic template on any
    // failure (no key, bad model, network) so the user never sees an error.
    const withText = (text: string | null, by: string): DraftResult =>
      text ? { ...result, text, notes: [...result.notes.filter((n) => !n.includes('template')), `Generated by ${by}.`] } : result

    if (result.route === 'local') {
      const model = this.requireDb().getSetting('ai.localModel')
      return model ? withText(await this.generateWithOllama(model, req), `your local model: ${model}`) : result
    }
    return withText(await this.generateWithProvider(result.route, req), result.routeLabel ?? result.route)
  }

  private async generateWithProvider(provider: string, req: DraftRequest): Promise<string | null> {
    const cfg = PROVIDER_HTTP[provider]
    const key = this.secrets.get(`ai.${provider}Key`)
    if (!cfg || !key) return null
    const model = this.requireDb().getSetting(`ai.${provider}Model`) || cfg.defaultModel
    const { url, init } = cfg.build(key, composePrompt(req), model)
    this.gateway.allow(cfg.host) // user holds a key + initiated this draft
    try {
      return await this.gateway.request({ host: cfg.host, purpose: `AI draft (${provider})` }, async () => {
        const res = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) })
        if (!res.ok) return null
        return cfg.parse(await res.json())
      })
    } catch {
      return null
    }
  }

  private async generateWithOllama(model: string, req: DraftRequest): Promise<string | null> {
    // No system message — the model's own Modelfile SYSTEM prompt governs
    // (e.g. a creator's trained law LLM keeps its litigation-co-counsel persona).
    const prompt = `${req.context}${req.persona ? `\nVoice: ${req.persona}` : ''}`
    try {
      const res = await fetch('http://127.0.0.1:11434/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, stream: false, messages: [{ role: 'user', content: prompt }] }),
        signal: AbortSignal.timeout(60_000),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { message?: { content?: string } }
      return data.message?.content?.trim() || null
    } catch {
      return null
    }
  }
  assistantConfig(): AssistantConfigResult {
    const db = this.requireDb()
    const models: Record<string, string> = {}
    for (const id of Object.keys(PROVIDER_HTTP)) {
      const v = db.getSetting(`ai.${id}Model`)
      if (v) models[id] = v
    }
    return {
      boundaries: this.assistantBoundaries(),
      providers: ALL_PROVIDERS,
      available: this.assistantAvailable(),
      localModel: db.getSetting('ai.localModel') ?? '',
      models,
      modelDefaults: providerModelDefaults(),
    }
  }
  setAssistantBoundaries(boundaries: string[]): void {
    this.requireDb().setSetting('assistant:boundaries', JSON.stringify(boundaries))
  }
  setAssistantKey(provider: string, key: string): void {
    if (key) this.secrets.set(`ai.${provider}Key`, key)
    else this.secrets.delete(`ai.${provider}Key`)
  }
  setProviderModel(provider: string, model: string): void {
    this.requireDb().setSetting(`ai.${provider}Model`, model.trim())
  }
  async ollamaStatus(): Promise<{ running: boolean; models: string[] }> {
    // Ollama is on-device — a direct localhost call, never routed through the
    // egress gateway (nothing leaves the machine).
    try {
      const res = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(1500) })
      if (!res.ok) return { running: false, models: [] }
      const data = (await res.json()) as { models?: { name: string }[] }
      return { running: true, models: (data.models ?? []).map((m) => m.name) }
    } catch {
      return { running: false, models: [] }
    }
  }
  setLocalModel(model: string): void {
    this.requireDb().setSetting('ai.localModel', model)
  }

  // --- scheduler / calendar ---

  listSchedule(): ScheduledItem[] {
    return new ScheduleService(this.requireDb()).list()
  }
  createSchedule(input: NewScheduledItem): ScheduledItem {
    return new ScheduleService(this.requireDb()).create(input)
  }
  setScheduleStatus(id: string, status: ScheduleStatus): void {
    new ScheduleService(this.requireDb()).setStatus(id, status)
  }
  removeSchedule(id: string): void {
    new ScheduleService(this.requireDb()).remove(id)
  }

  // --- compliance ---

  complianceOverview(): ComplianceOverview {
    const svc = new ComplianceService(this.requireDb())
    const net = this.pnlSummary().net
    const rate = 0.28
    return {
      records: svc.records(),
      custodian: svc.custodian(),
      custodianStatement: svc.custodianStatement(),
      tax: { net, rate, setAside: ComplianceService.taxSetAside(net, rate) },
    }
  }
  addComplianceRecord(input: NewRecord): TwoFiveSevenRecord {
    return new ComplianceService(this.requireDb()).addRecord(input)
  }
  removeComplianceRecord(id: string): void {
    new ComplianceService(this.requireDb()).removeRecord(id)
  }
  setCustodian(info: CustodianInfo): void {
    new ComplianceService(this.requireDb()).setCustodian(info)
  }
  dmcaNotice(input: DmcaInput): string {
    return ComplianceService.dmca(input)
  }

  // --- OBS (local studio control) ---

  private obsAddress(): string {
    return this.requireDb().getSetting('obs:address') ?? 'ws://127.0.0.1:4455'
  }
  async obsStatus(): Promise<ObsStatus> {
    if (!this.db) return { connected: false, streaming: false, recording: false, streamSeconds: 0, currentScene: '', scenes: [], error: 'Vault is locked.' }
    return fetchObsStatus(this.obsAddress(), { password: this.secrets.get('obs.password') ?? '' })
  }
  async connectObs(address: string, password: string): Promise<ObsStatus> {
    this.requireDb().setSetting('obs:address', address || 'ws://127.0.0.1:4455')
    if (password) this.secrets.set('obs.password', password)
    return this.obsStatus()
  }
  disconnectObs(): void {
    this.requireDb().setSetting('obs:address', '')
    this.secrets.delete('obs.password')
  }

  // --- website builder ---

  websiteConfig(): SiteConfig {
    const raw = this.requireDb().getSetting('website:config')
    return raw ? (JSON.parse(raw) as SiteConfig) : DEFAULT_SITE
  }
  saveWebsite(config: SiteConfig): void {
    this.requireDb().setSetting('website:config', JSON.stringify(config))
  }
  async exportWebsite(config: SiteConfig): Promise<string | null> {
    const html = buildSite(config)
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export link-in-bio site',
      defaultPath: `${config.handle || 'links'}-index.html`,
      filters: [{ name: 'HTML', extensions: ['html'] }],
    })
    if (canceled || !filePath) return null
    writeFileSync(filePath, html, 'utf8')
    return filePath
  }

  // --- encrypted backup & restore ---

  async exportBackup(password: string): Promise<string | null> {
    const now = new Date().toISOString()
    const file = sealBackup(this.requireDb().exportSnapshot(), password, now)
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export encrypted backup',
      defaultPath: `pinkbattleship-backup-${now.slice(0, 10)}.pbbak`,
      filters: [{ name: 'Pink Battleship backup', extensions: ['pbbak'] }],
    })
    if (canceled || !filePath) return null
    writeFileSync(filePath, JSON.stringify(file), 'utf8')
    return filePath
  }

  async restoreBackup(password: string): Promise<{ ok: boolean; error?: string; transactions?: number; connectors?: number }> {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Restore from backup (replaces current data)',
      properties: ['openFile'],
      filters: [{ name: 'Pink Battleship backup', extensions: ['pbbak', 'json'] }],
    })
    if (canceled || filePaths.length === 0) return { ok: false }
    try {
      const file = JSON.parse(readFileSync(filePaths[0], 'utf8')) as BackupFile
      const snapshot = openBackup(file, password)
      this.requireDb().importSnapshot(snapshot)
      return { ok: true, transactions: snapshot.transactions.length, connectors: snapshot.connectors.length }
    } catch {
      return { ok: false, error: 'Could not open this backup — wrong password, or not a valid Pink Battleship backup.' }
    }
  }

  // --- paid galleries & checkout (sandbox; live processor adapters plug in later) ---

  private checkout(): CheckoutService {
    return new CheckoutService(this.requireDb(), new MockProcessor())
  }
  listPaid() {
    return this.checkout().listPaid()
  }
  setPaid(galleryId: string, config: PaidConfig | null): void {
    this.checkout().setPaid(galleryId, config)
  }
  listSales() {
    return this.checkout().listSales()
  }
  listIntents() {
    return this.checkout().listIntents()
  }
  checkoutVamp() {
    return this.checkout().vampStats()
  }
  simulateSale(galleryId: string): { ok: boolean; reason?: string } {
    const r = this.checkout().simulateSale(galleryId)
    return { ok: r.ok, reason: r.reason }
  }
  disputeSale(saleId: string, type: 'refund' | 'chargeback'): { ok: boolean; reason?: string } {
    const r = this.checkout().disputeSale(saleId, type)
    return { ok: r.ok, reason: r.reason }
  }
  async exportEvidence(saleId: string): Promise<string | null> {
    const kit = this.checkout().evidenceKit(saleId)
    if (!kit) return null
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export chargeback evidence kit',
      defaultPath: `evidence-${kit.sale.processorTxnId}.json`,
      filters: [{ name: 'Evidence kit (JSON)', extensions: ['json'] }],
    })
    if (canceled || !filePath) return null
    writeFileSync(filePath, JSON.stringify(kit, null, 2), 'utf8')
    return filePath
  }

  // --- rates ---

  listRates(): RateRule[] {
    return this.requireDb().listRateRules()
  }

  upsertRate(rule: RateRule): void {
    this.requireDb().upsertRateRule(rule)
  }

  // --- settings (theme) ---

  getTheme(): ThemePref {
    const db = this.requireDb()
    return {
      theme: (db.getSetting('theme') as ThemeId | null) ?? 'blush',
      mode: (db.getSetting('mode') as ThemeMode | null) ?? 'light',
    }
  }

  setTheme(pref: ThemePref): void {
    const db = this.requireDb()
    db.setSetting('theme', pref.theme)
    db.setSetting('mode', pref.mode)
  }

  // --- privacy ---

  privacyReport(): PrivacyReport {
    const db = this.requireDb()
    const declared = db.listConnectors().map((c) => ({
      connectorId: c.id,
      platformId: c.platformId,
      driver: c.driver,
      dataFlows: c.driver === 'official' && c.platformId === 'chaturbate' ? [CHATURBATE_HOST] : [],
    }))
    return { declared, log: db.listEgress(200) }
  }
}

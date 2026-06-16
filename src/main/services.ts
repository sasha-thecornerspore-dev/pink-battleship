import { app } from 'electron'
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
import { ScheduleService, type NewScheduledItem } from '@core/schedule/scheduleService'
import { ComplianceService, type NewRecord, type CustodianInfo } from '@core/compliance/complianceService'
import { NetworkGateway } from '@core/privacy/networkGateway'
import { ChaturbateDriver, CHATURBATE_HOST, type ChaturbateEvent } from '@core/connectors/chaturbate'
import chaturbateFixture from '@core/connectors/fixtures/chaturbate-events.json'
import { parseCsvTransactions } from '@core/connectors/manualCsv'
import { seedDefaults } from './seed'
import type { Asset, AssistantProvider, ComplianceOverview, ConnectorInfo, DmcaInput, DraftRequest, DraftResult, EgressEntry, Fan, Gallery, PnlSummary, RateRule, ScheduledItem, ScheduleStatus, StatsReport, ThemeId, ThemeMode, TwoFiveSevenRecord } from '@shared/models'
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
    // Real generation for the local route: call Ollama with the chosen model.
    // Falls back to the deterministic template if Ollama is unavailable.
    if (result.ok && result.route === 'local') {
      const model = this.requireDb().getSetting('ai.localModel')
      if (model) {
        const text = await this.generateWithOllama(model, req)
        if (text) {
          return { ...result, text, notes: [...result.notes.filter((n) => !n.includes('template')), `Generated by your local model: ${model}.`] }
        }
      }
    }
    return result
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
  assistantConfig(): { boundaries: string[]; providers: AssistantProvider[]; available: string[]; localModel: string } {
    return {
      boundaries: this.assistantBoundaries(),
      providers: ALL_PROVIDERS,
      available: this.assistantAvailable(),
      localModel: this.requireDb().getSetting('ai.localModel') ?? '',
    }
  }
  setAssistantBoundaries(boundaries: string[]): void {
    this.requireDb().setSetting('assistant:boundaries', JSON.stringify(boundaries))
  }
  setAssistantKey(provider: string, key: string): void {
    if (key) this.secrets.set(`ai.${provider}Key`, key)
    else this.secrets.delete(`ai.${provider}Key`)
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

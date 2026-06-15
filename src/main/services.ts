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
import { NetworkGateway } from '@core/privacy/networkGateway'
import { ChaturbateDriver, CHATURBATE_HOST, type ChaturbateEvent } from '@core/connectors/chaturbate'
import chaturbateFixture from '@core/connectors/fixtures/chaturbate-events.json'
import { parseCsvTransactions } from '@core/connectors/manualCsv'
import { seedDefaults } from './seed'
import type { Asset, ConnectorInfo, EgressEntry, Fan, Gallery, PnlSummary, RateRule, StatsReport, ThemeId, ThemeMode } from '@shared/models'
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

import type { PbApiContract, VaultStatus, PrivacyReport } from '@shared/ipc'
import type { ConnectorInfo, RateRule, ThemeId, ThemeMode, Transaction } from '@shared/models'
import { InMemoryDatabase } from '@core/db/inMemoryDatabase'
import { PnlService } from '@core/pnl/pnlService'
import { FanService } from '@core/fans/fanService'
import { StatsService } from '@core/stats/statsService'
import { GalleryService } from '@core/gallery/galleryService'
import { ChaturbateDriver, CHATURBATE_HOST, type ChaturbateEvent } from '@core/connectors/chaturbate'
import chaturbateFixture from '@core/connectors/fixtures/chaturbate-events.json'
import { parseCsvTransactions } from '@core/connectors/manualCsv'

// In-browser demo backend: the SAME core logic the Electron app uses, running
// over an in-memory database. Active only when window.pb is absent (i.e. opened
// in a plain browser via `npm run prototype`). No network, no persistence.

const db = new InMemoryDatabase()
let seeded = false
let vaultState: VaultStatus = 'uninitialized'

function rate(id: string, platformId: string, r: number, note: string): RateRule {
  return { id, platformId, kind: 'platform_cut', rate: r, fixedFee: 0, effectiveFrom: '2020-01-01', effectiveTo: null, note, isEstimate: true }
}

function tx(platformId: string, gross: number, payer: string, day: string, kind: Transaction['kind']): Transaction {
  const connectorId = platformId === 'chaturbate' ? 'chaturbate-mock' : `manual:${platformId}`
  return {
    id: `${connectorId}:${payer}:${day}:${gross}`,
    connectorId,
    platformId,
    occurredAt: day,
    grossAmount: gross,
    currency: 'USD',
    kind,
    externalId: null,
    payerRef: payer,
  }
}

function seed(): void {
  if (seeded) return
  seeded = true
  db.upsertRateRule(rate('cb-cut', 'chaturbate', 0.5, 'Chaturbate revenue share (estimate)'))
  db.upsertRateRule(rate('of-cut', 'onlyfans', 0.2, 'OnlyFans 20% (estimate)'))
  db.upsertRateRule(rate('fs-cut', 'fansly', 0.2, 'Fansly 20% (estimate)'))
  db.upsertRateRule(rate('mv-cut', 'manyvids', 0.2, 'ManyVids share (estimate)'))
  db.upsertConnector({ id: 'chaturbate-mock', platformId: 'chaturbate', driver: 'official', riskLabel: 'official-low', status: 'healthy', lastSyncAt: '2026-05-30T00:00:00Z' })
  db.upsertConnector({ id: 'manual:onlyfans', platformId: 'onlyfans', driver: 'manual', riskLabel: 'manual-none', status: 'healthy', lastSyncAt: '2026-05-30T00:00:00Z' })
  db.insertTransactions([
    tx('chaturbate', 420, 'kingmaker', '2026-05-22T21:30:00Z', 'tip'),
    tx('chaturbate', 380, 'kingmaker', '2026-05-28T22:15:00Z', 'tip'),
    tx('chaturbate', 120, 'rosegold', '2026-05-24T20:45:00Z', 'tip'),
    tx('chaturbate', 60, 'rosegold', '2026-05-29T23:05:00Z', 'tip'),
    tx('chaturbate', 25, 'shy_guy', '2026-05-23T19:20:00Z', 'tip'),
    tx('chaturbate', 15, 'shy_guy', '2026-05-30T21:50:00Z', 'tip'),
    tx('onlyfans', 200, 'amber_vip', '2026-05-21T14:00:00Z', 'ppv'),
    tx('onlyfans', 24.99, 'amber_vip', '2026-05-25T20:00:00Z', 'sub'),
    tx('onlyfans', 24.99, 'danny', '2026-05-22T09:30:00Z', 'sub'),
    tx('onlyfans', 80, 'lux', '2026-05-26T22:40:00Z', 'ppv'),
    tx('fansly', 150, 'kingmaker', '2026-05-27T21:10:00Z', 'ppv'),
    tx('fansly', 45, 'fae', '2026-05-23T18:00:00Z', 'sub'),
    tx('manyvids', 60, 'collector', '2026-05-24T23:30:00Z', 'clip'),
    tx('manyvids', 90, 'collector', '2026-05-29T20:10:00Z', 'clip'),
    tx('manyvids', 35, 'oneoff', '2026-05-26T15:00:00Z', 'clip'),
  ])
  const gallery = new GalleryService(db)
  gallery.galleries()
  gallery.addAssets('master', [
    { filename: 'shoot_blue_01.jpg', mediaKind: 'image', nsfw: true, tags: ['lingerie', 'blue'], postedTo: ['onlyfans', 'fansly'], dims: '1920×1080' },
    { filename: 'shoot_blue_02.jpg', mediaKind: 'image', nsfw: true, tags: ['lingerie', 'blue'], postedTo: ['onlyfans'], dims: '1920×1080' },
    { filename: 'teaser_clip.mp4', mediaKind: 'video', nsfw: false, tags: ['teaser', 'sfw'], postedTo: ['reddit', 'x'], dims: '0:18' },
    { filename: 'bts_selfie.jpg', mediaKind: 'image', nsfw: false, tags: ['bts', 'sfw'], postedTo: ['x'], dims: '1080×1080' },
    { filename: 'custom_anna.mp4', mediaKind: 'video', nsfw: true, tags: ['custom', 'ppv'], postedTo: [], dims: '4:12' },
    { filename: 'shower_set_01.jpg', mediaKind: 'image', nsfw: true, tags: ['shower'], postedTo: ['manyvids'], dims: '1440×1920' },
  ])
  const ppv = gallery.createSet('May PPV')
  gallery.addAssets(ppv.id, [
    { filename: 'ppv_may_a.jpg', mediaKind: 'image', nsfw: true, tags: ['ppv'], postedTo: [], dims: '1920×1080' },
    { filename: 'ppv_may_b.mp4', mediaKind: 'video', nsfw: true, tags: ['ppv'], postedTo: [], dims: '2:30' },
  ])
}

function privacyReport(): PrivacyReport {
  const declared = db.listConnectors().map((c) => ({
    connectorId: c.id,
    platformId: c.platformId,
    driver: c.driver,
    dataFlows: c.driver === 'official' && c.platformId === 'chaturbate' ? [CHATURBATE_HOST] : [],
  }))
  return { declared, log: db.listEgress(200) }
}

export function createDemoBackend(): PbApiContract {
  return {
    vault: {
      status: () => Promise.resolve(vaultState),
      setup: () => {
        seed()
        vaultState = 'unlocked'
        return Promise.resolve<VaultStatus>('unlocked')
      },
      unlock: () => {
        seed()
        vaultState = 'unlocked'
        return Promise.resolve({ ok: true })
      },
      lock: () => {
        vaultState = 'locked'
        return Promise.resolve()
      },
    },
    connectors: {
      list: () => Promise.resolve(db.listConnectors()),
      connectChaturbateMock: () => {
        const info: ConnectorInfo = { id: 'chaturbate-mock', platformId: 'chaturbate', driver: 'official', riskLabel: 'official-low', status: 'needs_sync', lastSyncAt: null }
        db.upsertConnector(info)
        return Promise.resolve(info)
      },
      connectChaturbate: () => {
        const info: ConnectorInfo = { id: 'chaturbate', platformId: 'chaturbate', driver: 'official', riskLabel: 'official-low', status: 'needs_sync', lastSyncAt: null }
        db.upsertConnector(info)
        return Promise.resolve(info)
      },
      sync: async (id) => {
        const info = db.listConnectors().find((c) => c.id === id)
        if (info?.platformId === 'chaturbate') {
          const driver = new ChaturbateDriver({ mock: true, fixture: chaturbateFixture as ChaturbateEvent[] })
          const txs = await driver.sync({ connectorId: id, platformId: 'chaturbate' })
          db.insertTransactions(txs)
          db.upsertConnector({ ...info, status: 'healthy', lastSyncAt: '2026-06-01T00:00:00Z' })
          return { inserted: txs.length }
        }
        return { inserted: 0 }
      },
    },
    imports: {
      csv: (req) => {
        const connectorId = `manual:${req.platformId}`
        const res = parseCsvTransactions(req.csv, { platformId: req.platformId, connectorId, map: req.map })
        db.insertTransactions(res.transactions)
        if (!db.listConnectors().some((c) => c.id === connectorId)) {
          db.upsertConnector({ id: connectorId, platformId: req.platformId, driver: 'manual', riskLabel: 'manual-none', status: 'healthy', lastSyncAt: '2026-06-01T00:00:00Z' })
        }
        return Promise.resolve({ inserted: res.transactions.length, skipped: res.skipped })
      },
    },
    pnl: {
      summary: () => Promise.resolve(new PnlService(db).summary()),
    },
    rates: {
      list: () => Promise.resolve(db.listRateRules()),
      upsert: (rule) => {
        db.upsertRateRule(rule)
        return Promise.resolve()
      },
    },
    settings: {
      getTheme: () =>
        Promise.resolve({
          theme: (db.getSetting('theme') as ThemeId | null) ?? 'blush',
          mode: (db.getSetting('mode') as ThemeMode | null) ?? 'light',
        }),
      setTheme: (pref) => {
        db.setSetting('theme', pref.theme)
        db.setSetting('mode', pref.mode)
        return Promise.resolve()
      },
    },
    privacy: {
      dataFlows: () => Promise.resolve(privacyReport()),
    },
    fans: {
      list: () => Promise.resolve(new FanService(db).list()),
      setNote: (fanId, note) => {
        new FanService(db).setNote(fanId, note)
        return Promise.resolve()
      },
    },
    stats: {
      report: () => Promise.resolve(new StatsService(db).report()),
    },
    galleries: {
      list: () => Promise.resolve(new GalleryService(db).galleries()),
      createSet: (name) => Promise.resolve(new GalleryService(db).createSet(name)),
      assets: (galleryId) => Promise.resolve(new GalleryService(db).assets(galleryId)),
      setTags: (assetId, tags) => {
        new GalleryService(db).setTags(assetId, tags)
        return Promise.resolve()
      },
      togglePosted: (assetId, platformId) => {
        new GalleryService(db).togglePosted(assetId, platformId)
        return Promise.resolve()
      },
    },
  }
}

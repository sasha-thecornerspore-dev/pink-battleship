import type { PbApiContract, VaultStatus, PrivacyReport } from '@shared/ipc'
import type { ConnectorInfo, ObsStatus, RateRule, ThemeId, ThemeMode, Transaction } from '@shared/models'
import { InMemoryDatabase } from '@core/db/inMemoryDatabase'
import { PnlService } from '@core/pnl/pnlService'
import { FanService } from '@core/fans/fanService'
import { StatsService } from '@core/stats/statsService'
import { GalleryService } from '@core/gallery/galleryService'
import { AssistantService, ALL_PROVIDERS } from '@core/assistant/assistantService'
import { providerModelDefaults } from '@core/assistant/providerHttp'
import { ScheduleService } from '@core/schedule/scheduleService'
import { ComplianceService } from '@core/compliance/complianceService'
import { ChaturbateDriver, CHATURBATE_HOST, type ChaturbateEvent } from '@core/connectors/chaturbate'
import chaturbateFixture from '@core/connectors/fixtures/chaturbate-events.json'
import { parseCsvTransactions } from '@core/connectors/manualCsv'
import { buildSite, DEFAULT_SITE } from '@core/website/siteBuilder'
import type { SiteConfig } from '@shared/models'

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
    tx('chaturbate', 40, 'old_flame', '2026-05-04T20:00:00Z', 'tip'),
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
  const sched = new ScheduleService(db)
  sched.create({ platformId: 'chaturbate', kind: 'go_live', title: 'Evening cam show', caption: '', scheduledAt: '2026-06-15T20:00:00Z' })
  sched.create({ platformId: 'onlyfans', kind: 'post', title: 'Blue lingerie set drop', caption: 'New drop 🩷 link in bio', scheduledAt: '2026-06-16T18:00:00Z' })
  sched.create({ platformId: 'onlyfans', kind: 'mass_dm', title: 'PPV blast to lapsed fans', caption: '', scheduledAt: '2026-06-17T16:00:00Z' })
  sched.create({ platformId: 'reddit', kind: 'promo', title: 'SFW teaser cross-post', caption: '', scheduledAt: '2026-06-17T19:00:00Z' })
  sched.create({ platformId: 'fansly', kind: 'post', title: 'Shower set', caption: '', scheduledAt: '2026-06-18T21:00:00Z' })
  sched.create({ platformId: 'manyvids', kind: 'post', title: 'Custom clip release', caption: '', scheduledAt: '2026-06-20T17:00:00Z' })
  db.setSetting('obs:address', 'ws://127.0.0.1:4455') // demo shows OBS already linked
  const site: SiteConfig = {
    handle: 'rosiebelle',
    displayName: 'Rosie Belle',
    tagline: 'cam shows · customs · clips',
    bio: 'New drops every Friday 🩷 Tips always appreciated. Be sweet.',
    links: [
      { label: 'OnlyFans — subscribe', url: 'https://onlyfans.com/rosiebelle' },
      { label: 'Chaturbate — live tonight', url: 'https://chaturbate.com/rosiebelle' },
      { label: 'ManyVids — clip store', url: 'https://manyvids.com/rosiebelle' },
      { label: 'Wishlist', url: 'https://throne.com/rosiebelle' },
    ],
    theme: 'blush',
    ageGate: true,
  }
  db.setSetting('website:config', JSON.stringify(site))
  db.setSetting('ai.groqKey', 'demo-key') // shows a connected provider + its model picker in Settings
}

function demoObs(): ObsStatus {
  if (!db.getSetting('obs:address')) {
    return { connected: false, streaming: false, recording: false, streamSeconds: 0, currentScene: '', scenes: [], error: 'Not connected. Open OBS and enable the WebSocket server (Tools → WebSocket Server Settings).' }
  }
  return { connected: true, streaming: true, recording: false, streamSeconds: 4215, currentScene: 'Main Cam', scenes: ['Main Cam', 'BRB', 'Close-up', 'Just Chatting'] }
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

function demoAiAvailable(): string[] {
  const keyed = ALL_PROVIDERS.filter((p) => p.needsKey && db.getSetting(`ai.${p.id}Key`)).map((p) => p.id)
  return ['local', ...keyed]
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
      disconnect: (id) => {
        db.removeConnector(id)
        return Promise.resolve()
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
      detail: (fanId) => Promise.resolve(new FanService(db).detail(fanId)),
    },
    stats: {
      report: () => Promise.resolve(new StatsService(db).report()),
    },
    assistant: {
      draft: (req) => {
        const r = db.getSetting('assistant:boundaries')
        const boundaries = r ? (JSON.parse(r) as string[]) : []
        return Promise.resolve(new AssistantService().draft(req, { boundaries }, demoAiAvailable()))
      },
      config: () => {
        const r = db.getSetting('assistant:boundaries')
        const boundaries = r ? (JSON.parse(r) as string[]) : []
        const models: Record<string, string> = {}
        for (const id of Object.keys(providerModelDefaults())) {
          const v = db.getSetting(`ai.${id}Model`)
          if (v) models[id] = v
        }
        return Promise.resolve({ boundaries, providers: ALL_PROVIDERS, available: demoAiAvailable(), localModel: db.getSetting('ai.localModel') ?? '', models, modelDefaults: providerModelDefaults() })
      },
      setBoundaries: (boundaries) => {
        db.setSetting('assistant:boundaries', JSON.stringify(boundaries))
        return Promise.resolve()
      },
      setKey: (provider, key) => {
        db.setSetting(`ai.${provider}Key`, key)
        return Promise.resolve()
      },
      ollama: () => Promise.resolve({ running: true, models: ['dolphin-llama3:8b', 'mistral-nemo:12b', 'nous-hermes3:8b'] }),
      setLocalModel: (model) => {
        db.setSetting('ai.localModel', model)
        return Promise.resolve()
      },
      setModel: (provider, model) => {
        db.setSetting(`ai.${provider}Model`, model.trim())
        return Promise.resolve()
      },
    },
    compliance: {
      overview: () => {
        const svc = new ComplianceService(db)
        const net = new PnlService(db).summary().net
        const rate = 0.28
        return Promise.resolve({
          records: svc.records(),
          custodian: svc.custodian(),
          custodianStatement: svc.custodianStatement(),
          tax: { net, rate, setAside: ComplianceService.taxSetAside(net, rate) },
        })
      },
      addRecord: (input) => Promise.resolve(new ComplianceService(db).addRecord(input)),
      removeRecord: (id) => {
        new ComplianceService(db).removeRecord(id)
        return Promise.resolve()
      },
      setCustodian: (info) => {
        new ComplianceService(db).setCustodian(info)
        return Promise.resolve()
      },
      dmca: (input) => Promise.resolve(ComplianceService.dmca(input)),
    },
    schedule: {
      list: () => Promise.resolve(new ScheduleService(db).list()),
      create: (input) => Promise.resolve(new ScheduleService(db).create(input)),
      setStatus: (id, status) => {
        new ScheduleService(db).setStatus(id, status)
        return Promise.resolve()
      },
      remove: (id) => {
        new ScheduleService(db).remove(id)
        return Promise.resolve()
      },
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
      importFiles: (galleryId) => {
        // The desktop app opens a native file picker; the browser demo simulates
        // a couple of reference-in-place imports so the flow is visible.
        new GalleryService(db).addAssets(galleryId, [
          { filename: 'imported_shoot_01.jpg', mediaKind: 'image', nsfw: true, tags: ['imported'], postedTo: [], dims: '3024×4032', sourcePath: 'C:\\Users\\you\\Pictures\\imported_shoot_01.jpg', sizeBytes: 5_242_880 },
          { filename: 'imported_clip.mp4', mediaKind: 'video', nsfw: true, tags: ['imported'], postedTo: [], dims: '0:42', sourcePath: 'C:\\Users\\you\\Videos\\imported_clip.mp4', sizeBytes: 84_320_768, durationSeconds: 42 },
        ])
        return Promise.resolve({ added: 2, skipped: 0 })
      },
    },
    obs: {
      status: () => Promise.resolve(demoObs()),
      connect: (address) => {
        db.setSetting('obs:address', address || 'ws://127.0.0.1:4455')
        return Promise.resolve(demoObs())
      },
      disconnect: () => {
        db.setSetting('obs:address', '')
        return Promise.resolve()
      },
    },
    website: {
      getConfig: () => {
        const raw = db.getSetting('website:config')
        return Promise.resolve(raw ? (JSON.parse(raw) as SiteConfig) : DEFAULT_SITE)
      },
      save: (config) => {
        db.setSetting('website:config', JSON.stringify(config))
        return Promise.resolve()
      },
      export: (config) => {
        const blob = new Blob([buildSite(config)], { type: 'text/html' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `${config.handle || 'links'}-index.html`
        a.click()
        URL.revokeObjectURL(a.href)
        return Promise.resolve('(downloaded)')
      },
    },
    system: {
      openExternal: (url) => {
        window.open(url, '_blank', 'noopener,noreferrer')
        return Promise.resolve()
      },
    },
    backup: {
      // The desktop app encrypts with node:crypto + a native save dialog; the
      // browser demo just downloads the snapshot so the flow is visible.
      export: () => {
        const blob = new Blob([JSON.stringify(db.exportSnapshot(), null, 2)], { type: 'application/json' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'pinkbattleship-demo-snapshot.json'
        a.click()
        URL.revokeObjectURL(a.href)
        return Promise.resolve('(downloaded demo snapshot)')
      },
      restore: () => Promise.resolve({ ok: false, error: 'Restore runs in the desktop app.' }),
    },
  }
}

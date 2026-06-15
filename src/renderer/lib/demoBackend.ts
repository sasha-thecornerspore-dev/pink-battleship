import type { PbApiContract, VaultStatus, PrivacyReport } from '@shared/ipc'
import type { ConnectorInfo, RateRule, ThemeId, ThemeMode, Transaction } from '@shared/models'
import { InMemoryDatabase } from '@core/db/inMemoryDatabase'
import { PnlService } from '@core/pnl/pnlService'
import { FanService } from '@core/fans/fanService'
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
    tx('chaturbate', 420, 'kingmaker', '2026-05-22', 'tip'),
    tx('chaturbate', 380, 'kingmaker', '2026-05-28', 'tip'),
    tx('chaturbate', 120, 'rosegold', '2026-05-24', 'tip'),
    tx('chaturbate', 60, 'rosegold', '2026-05-29', 'tip'),
    tx('chaturbate', 25, 'shy_guy', '2026-05-23', 'tip'),
    tx('chaturbate', 15, 'shy_guy', '2026-05-30', 'tip'),
    tx('onlyfans', 200, 'amber_vip', '2026-05-21', 'ppv'),
    tx('onlyfans', 24.99, 'amber_vip', '2026-05-25', 'sub'),
    tx('onlyfans', 24.99, 'danny', '2026-05-22', 'sub'),
    tx('onlyfans', 80, 'lux', '2026-05-26', 'ppv'),
    tx('fansly', 150, 'kingmaker', '2026-05-27', 'ppv'),
    tx('fansly', 45, 'fae', '2026-05-23', 'sub'),
    tx('manyvids', 60, 'collector', '2026-05-24', 'clip'),
    tx('manyvids', 90, 'collector', '2026-05-29', 'clip'),
    tx('manyvids', 35, 'oneoff', '2026-05-26', 'clip'),
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
  }
}

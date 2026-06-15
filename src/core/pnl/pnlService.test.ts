import { describe, it, expect } from 'vitest'
import { InMemoryDatabase } from '../db/inMemoryDatabase'
import { PnlService } from './pnlService'
import type { ConnectorInfo, RateRule, Transaction } from '@shared/models'

function seed(): InMemoryDatabase {
  const db = new InMemoryDatabase()
  const conn = (id: string, platformId: string, driver: 'official' | 'manual'): ConnectorInfo => ({
    id,
    platformId,
    driver,
    riskLabel: driver === 'official' ? 'official-low' : 'manual-none',
    status: 'healthy',
    lastSyncAt: null,
  })
  db.upsertConnector(conn('c1', 'chaturbate', 'official'))
  db.upsertConnector(conn('c2', 'onlyfans', 'manual'))
  const rule = (id: string, platformId: string, rate: number): RateRule => ({
    id,
    platformId,
    kind: 'platform_cut',
    rate,
    fixedFee: 0,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    isEstimate: true,
  })
  db.upsertRateRule(rule('r1', 'chaturbate', 0.5))
  db.upsertRateRule(rule('r2', 'onlyfans', 0.2))
  const tx = (id: string, platformId: string, gross: number, payer: string, day: string): Transaction => ({
    id,
    connectorId: 'c',
    platformId,
    occurredAt: day,
    grossAmount: gross,
    currency: 'USD',
    kind: 'tip',
    externalId: null,
    payerRef: payer,
  })
  db.insertTransactions([
    tx('a', 'chaturbate', 100, 'fan1', '2026-05-01'),
    tx('b', 'chaturbate', 100, 'fan2', '2026-05-02'),
    tx('c', 'onlyfans', 50, 'fan1', '2026-05-01'),
  ])
  return db
}

describe('PnlService', () => {
  it('computes gross, net, fees, per-platform breakdown and active fans', () => {
    const s = new PnlService(seed()).summary()
    expect(s.gross).toBe(250)
    expect(s.net).toBe(140)
    expect(s.fees).toBe(110)
    expect(s.activeFans).toBe(3)
    const cb = s.byPlatform.find((p) => p.platformId === 'chaturbate')!
    expect(cb.net).toBe(100)
    expect(cb.driver).toBe('official')
    expect(s.dailyNet).toHaveLength(2)
  })
})

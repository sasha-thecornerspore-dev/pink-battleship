import { describe, it, expect } from 'vitest'
import { InMemoryDatabase } from '../db/inMemoryDatabase'
import { StatsService } from './statsService'
import type { Transaction } from '@shared/models'

function seed(): InMemoryDatabase {
  const db = new InMemoryDatabase()
  db.upsertRateRule({ id: 'cb', platformId: 'chaturbate', kind: 'platform_cut', rate: 0, fixedFee: 0, effectiveFrom: '2020-01-01', effectiveTo: null, isEstimate: true })
  const tx = (id: string, ts: string, gross: number): Transaction => ({
    id,
    connectorId: 'c',
    platformId: 'chaturbate',
    occurredAt: ts,
    grossAmount: gross,
    currency: 'USD',
    kind: 'tip',
    externalId: null,
    payerRef: 'f',
  })
  db.insertTransactions([
    tx('a', '2026-05-01T20:00:00Z', 100),
    tx('b', '2026-05-01T21:00:00Z', 50),
    tx('c', '2026-05-03T20:00:00Z', 30),
  ])
  return db
}

describe('StatsService', () => {
  it('builds a filled daily series with a trailing moving average', () => {
    const r = new StatsService(seed()).report(7)
    expect(r.series).toHaveLength(3)
    expect(r.series[0]).toMatchObject({ date: '2026-05-01', net: 150 })
    expect(r.series[1].net).toBe(0)
    expect(r.series[2].ma).toBe(60)
  })

  it('builds a net-earnings heatmap and headline summary', () => {
    const r = new StatsService(seed()).report()
    expect(r.summary.totalNet).toBe(180)
    expect(r.summary.bestDay).toMatchObject({ date: '2026-05-01', net: 150 })
    expect(r.summary.bestHour?.net).toBe(100)
    expect(r.summary.bestHour?.hour).toBe(20)
    expect(r.heatmap.find((c) => c.hour === 20 && c.net === 100)).toBeTruthy()
  })
})

import { describe, it, expect } from 'vitest'
import { InMemoryDatabase } from '../db/inMemoryDatabase'
import { FanService } from './fanService'
import type { RateRule, Transaction } from '@shared/models'

function seed(): InMemoryDatabase {
  const db = new InMemoryDatabase()
  const rule = (id: string, platformId: string, rate: number): RateRule => ({
    id,
    platformId,
    kind: 'platform_cut',
    rate,
    fixedFee: 0,
    effectiveFrom: '2020-01-01',
    effectiveTo: null,
    isEstimate: true,
  })
  db.upsertRateRule(rule('cb', 'chaturbate', 0))
  db.upsertRateRule(rule('of', 'onlyfans', 0))
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
    tx('a', 'chaturbate', 600, 'whale_w', '2026-05-01'),
    tx('b', 'chaturbate', 50, 'whale_w', '2026-05-09'),
    tx('c', 'onlyfans', 120, 'vip_v', '2026-05-03'),
    tx('d', 'onlyfans', 10, 'reg_r', '2026-05-02'),
  ])
  return db
}

describe('FanService', () => {
  it('aggregates per payer, ranks by net, and assigns tiers', () => {
    const fans = new FanService(seed()).list()
    expect(fans).toHaveLength(3)
    expect(fans[0]).toMatchObject({ payerRef: 'whale_w', totalNet: 650, txCount: 2, tier: 'whale', lastSeen: '2026-05-09' })
    expect(fans[1]).toMatchObject({ payerRef: 'vip_v', tier: 'vip' })
    expect(fans[2]).toMatchObject({ payerRef: 'reg_r', tier: 'regular' })
  })

  it('stores and returns per-fan notes', () => {
    const db = seed()
    const svc = new FanService(db)
    svc.setNote('chaturbate:whale_w', 'loves blue lingerie, tips on Fridays')
    const fan = svc.list().find((f) => f.id === 'chaturbate:whale_w')
    expect(fan?.note).toBe('loves blue lingerie, tips on Fridays')
  })
})

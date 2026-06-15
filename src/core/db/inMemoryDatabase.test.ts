import { describe, it, expect } from 'vitest'
import { InMemoryDatabase } from './inMemoryDatabase'
import type { Transaction } from '@shared/models'

const tx = (id: string, platformId: string, gross: number, payer: string): Transaction => ({
  id,
  connectorId: 'c',
  platformId,
  occurredAt: '2026-05-01',
  grossAmount: gross,
  currency: 'USD',
  kind: 'tip',
  externalId: null,
  payerRef: payer,
})

describe('InMemoryDatabase', () => {
  it('inserts, upserts and queries transactions', () => {
    const db = new InMemoryDatabase()
    db.insertTransactions([tx('a', 'chaturbate', 10, 'x'), tx('b', 'onlyfans', 20, 'y')])
    db.insertTransactions([tx('a', 'chaturbate', 15, 'x')])
    expect(db.queryTransactions()).toHaveLength(2)
    expect(db.queryTransactions({ platformId: 'chaturbate' })[0].grossAmount).toBe(15)
  })

  it('stores rate rules and settings', () => {
    const db = new InMemoryDatabase()
    db.upsertRateRule({
      id: 'r',
      platformId: 'chaturbate',
      kind: 'platform_cut',
      rate: 0.5,
      fixedFee: 0,
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
      isEstimate: true,
    })
    expect(db.listRateRules('chaturbate')).toHaveLength(1)
    db.setSetting('theme', 'blush')
    expect(db.getSetting('theme')).toBe('blush')
    expect(db.getSetting('missing')).toBeNull()
  })
})

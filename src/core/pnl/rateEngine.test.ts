import { describe, it, expect } from 'vitest'
import { netForTransaction } from './rateEngine'
import type { RateRule } from '@shared/models'

const rules: RateRule[] = [
  { id: 'r1', platformId: 'chaturbate', kind: 'platform_cut', rate: 0.5, fixedFee: 0, effectiveFrom: '2026-01-01', effectiveTo: null, isEstimate: true },
  { id: 'r2', platformId: 'chaturbate', kind: 'processor_fee', rate: 0, fixedFee: 0.3, effectiveFrom: '2026-01-01', effectiveTo: null, isEstimate: true },
  { id: 'r3', platformId: 'onlyfans', kind: 'platform_cut', rate: 0.2, fixedFee: 0, effectiveFrom: '2026-01-01', effectiveTo: null, isEstimate: true },
]

describe('netForTransaction', () => {
  it('applies the dated platform cut plus fixed processor fee', () => {
    const net = netForTransaction({ platformId: 'chaturbate', grossAmount: 100, occurredAt: '2026-05-01' }, rules)
    expect(net).toBe(49.7)
  })

  it('uses the right platform rules only', () => {
    const net = netForTransaction({ platformId: 'onlyfans', grossAmount: 100, occurredAt: '2026-05-01' }, rules)
    expect(net).toBe(80)
  })

  it('ignores rules outside the effective window', () => {
    const net = netForTransaction({ platformId: 'chaturbate', grossAmount: 100, occurredAt: '2025-06-01' }, rules)
    expect(net).toBe(100)
  })
})

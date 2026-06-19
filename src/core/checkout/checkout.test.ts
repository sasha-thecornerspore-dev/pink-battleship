import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryDatabase } from '../db/inMemoryDatabase'
import { CheckoutService } from './checkoutService'
import { MockProcessor } from './mockProcessor'
import type { SignedPostback } from './processor'

function svc(): CheckoutService {
  return new CheckoutService(new InMemoryDatabase(), new MockProcessor())
}

describe('CheckoutService — publishing', () => {
  it('publishes and unpublishes a gallery for sale', () => {
    const s = svc()
    s.setPaid('set:may', { priceMinor: 1500, currency: 'USD', processor: 'mock' })
    expect(s.paidConfig('set:may')).toEqual({ priceMinor: 1500, currency: 'USD', processor: 'mock' })
    s.setPaid('set:may', null)
    expect(s.paidConfig('set:may')).toBeNull()
  })

  it('refuses checkout for an unpublished gallery', () => {
    expect(() => svc().startCheckout('set:nope')).toThrow(/not published/i)
  })
})

describe('CheckoutService — the trust gate', () => {
  let s: CheckoutService
  beforeEach(() => {
    s = svc()
    s.setPaid('set:may', { priceMinor: 1500, currency: 'USD', processor: 'mock' })
  })

  it('unlocks only after a verified, reconciled postback; records a watermarked sale', () => {
    const r = s.simulateSale('set:may')
    expect(r.ok).toBe(true)
    expect(r.sale?.status).toBe('paid')
    expect(r.sale?.watermarkId).toMatch(/^wm_/)
    expect(s.listSales()).toHaveLength(1)
    // the intent is consumed, not left pending
    expect(s.listIntents()[0].status).toBe('consumed')
  })

  it('rejects a postback whose signature does not verify', () => {
    const { intent } = s.startCheckout('set:may', 'btk_x')
    const forged: SignedPostback = {
      payload: { intentRef: intent.intentRef, processorTxnId: 'txn_1', grossAmountMinor: 1500, currency: 'USD', buyerTokenHash: 'btk_x', eventType: 'sale', paidAt: '2026-06-18T00:00:00Z' },
      signature: 'sbx_deadbeef', // wrong
    }
    expect(s.processPostback(forged).ok).toBe(false)
    expect(s.listSales()).toHaveLength(0)
  })

  it('rejects an unknown intent_ref', () => {
    const proc = new MockProcessor()
    const fakeIntent = { intentId: 'x', intentRef: 'nonexistent', galleryId: 'set:may', priceMinor: 1500, currency: 'USD', processor: 'mock' as const, status: 'pending' as const, createdAt: '', buyerTokenHash: 'b' }
    const signed = proc.simulatePostback(fakeIntent, { processorTxnId: 'txn_1', paidAt: '2026-06-18T00:00:00Z' })
    expect(s.processPostback(signed).reason).toMatch(/unknown intent_ref/i)
  })

  it('holds (does not unlock) on underpayment or wrong currency', () => {
    const proc = new MockProcessor()
    const { intent } = s.startCheckout('set:may', 'btk_x')
    const underpaid = proc.simulatePostback(intent, { processorTxnId: 'txn_u', paidAt: 'now', amountMinor: 500 })
    expect(s.processPostback(underpaid).reason).toMatch(/underpayment/i)
    const wrongCur = proc.simulatePostback(intent, { processorTxnId: 'txn_c', paidAt: 'now', currency: 'EUR' })
    expect(s.processPostback(wrongCur).reason).toMatch(/currency/i)
    expect(s.listSales()).toHaveLength(0)
  })

  it('is idempotent — a duplicate (processor, txn) postback collapses to one sale', () => {
    const proc = new MockProcessor()
    const { intent } = s.startCheckout('set:may', 'btk_x')
    const signed = proc.simulatePostback(intent, { processorTxnId: 'txn_dup', paidAt: 'now' })
    expect(s.processPostback(signed).ok).toBe(true)
    expect(s.processPostback(signed).ok).toBe(true) // replay
    expect(s.listSales()).toHaveLength(1)
  })
})

describe('CheckoutService — disputes, evidence, VAMP', () => {
  let s: CheckoutService
  beforeEach(() => {
    s = svc()
    s.setPaid('set:may', { priceMinor: 1500, currency: 'USD', processor: 'mock' })
  })

  it('a chargeback flips the sale status and counts toward the VAMP ratio', () => {
    const sale = s.simulateSale('set:may').sale!
    s.disputeSale(sale.saleId, 'chargeback')
    expect(s.listSales()[0].status).toBe('chargeback')
    expect(s.vampStats()).toMatchObject({ sales: 1, disputes: 1, ratioPct: 100 })
  })

  it('builds an evidence kit bundling the sale + reconciled intent', () => {
    const sale = s.simulateSale('set:may').sale!
    const kit = s.evidenceKit(sale.saleId)
    expect(kit?.sale.saleId).toBe(sale.saleId)
    expect(kit?.intent?.intentRef).toBe(sale.intentRef)
    expect(kit?.note).toMatch(/watermark/i)
  })
})

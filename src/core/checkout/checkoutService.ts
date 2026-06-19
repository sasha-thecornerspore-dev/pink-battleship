import type { Database } from '../db/database'
import type { CheckoutIntent, PaidConfig, Sale, SaleStatus, VampStats } from '@shared/models'
import type { Processor, CheckoutSession, SignedPostback } from './processor'

const PAID_KEY = 'checkout:paid'
const INTENTS_KEY = 'checkout:intents'
const SALES_KEY = 'checkout:sales'
const SALT_KEY = 'checkout:watermarkSalt'

// VAMP dispute threshold (since Apr 1 2026) — surfaced in the UI as the line to stay under.
export const VAMP_THRESHOLD_PCT = 1.5

function uuid(): string {
  return globalThis.crypto.randomUUID()
}
function ref(): string {
  return (uuid() + uuid()).replace(/-/g, '')
}
function fnvHex(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export interface ProcessResult {
  ok: boolean
  reason?: string
  sale?: Sale
}

export interface EvidenceKit {
  generatedAt: string
  note: string
  sale: Sale
  intent: CheckoutIntent | null
}

/**
 * Orchestrates paid-gallery checkout with the DESKTOP as the sole release
 * authority. Publish a gallery for sale, mint a CheckoutIntent, and only unlock
 * after re-verifying the processor's signed postback AND reconciling it against
 * the persisted intent (amount ≥ price, currency match, single-use per
 * processor txn). Intents/sales/config live as JSON in the encrypted vault.
 * The Processor is injected — the sandbox MockProcessor today, real adapters
 * later. See docs/paid-galleries-design.md.
 */
export class CheckoutService {
  constructor(
    private readonly db: Database,
    private readonly processor: Processor,
  ) {}

  private readJson<T>(key: string, fallback: T): T {
    const r = this.db.getSetting(key)
    return r ? (JSON.parse(r) as T) : fallback
  }
  private writeJson(key: string, value: unknown): void {
    this.db.setSetting(key, JSON.stringify(value))
  }

  // --- publishing ---

  listPaid(): Record<string, PaidConfig> {
    return this.readJson<Record<string, PaidConfig>>(PAID_KEY, {})
  }
  paidConfig(galleryId: string): PaidConfig | null {
    return this.listPaid()[galleryId] ?? null
  }
  setPaid(galleryId: string, config: PaidConfig | null): void {
    const all = this.listPaid()
    if (config) all[galleryId] = config
    else delete all[galleryId]
    this.writeJson(PAID_KEY, all)
  }

  listIntents(): CheckoutIntent[] {
    return this.readJson<CheckoutIntent[]>(INTENTS_KEY, [])
  }
  listSales(): Sale[] {
    return this.readJson<Sale[]>(SALES_KEY, [])
  }

  private watermarkSalt(): string {
    let s = this.db.getSetting(SALT_KEY)
    if (!s) {
      s = uuid()
      this.db.setSetting(SALT_KEY, s)
    }
    return s
  }
  private watermarkId(buyerTokenHash: string, galleryId: string, saleId: string): string {
    return 'wm_' + fnvHex(`${this.watermarkSalt()}|${buyerTokenHash}|${galleryId}|${saleId}`)
  }

  // --- checkout flow ---

  /** Mint a local intent + hand it to the processor's hosted page. */
  startCheckout(galleryId: string, buyerTokenHash?: string): { intent: CheckoutIntent; session: CheckoutSession } {
    const cfg = this.paidConfig(galleryId)
    if (!cfg) throw new Error('Gallery is not published for sale')
    const now = new Date().toISOString()
    const intent: CheckoutIntent = {
      intentId: uuid(),
      intentRef: ref(),
      galleryId,
      priceMinor: cfg.priceMinor,
      currency: cfg.currency,
      processor: cfg.processor,
      status: 'pending',
      createdAt: now,
      buyerTokenHash,
    }
    const intents = this.listIntents()
    intents.push(intent)
    this.writeJson(INTENTS_KEY, intents)
    return { intent, session: this.processor.createCheckout(intent, { now }) }
  }

  /**
   * The trust gate. Re-verify the signed postback, reconcile against the
   * persisted intent, enforce single-use, then record the sale (or apply a
   * refund/chargeback revocation). Nothing unlocks unless every check passes.
   */
  processPostback(signed: SignedPostback): ProcessResult {
    const v = this.processor.verifyCallback(signed)
    if (!v.ok || !v.payload) return { ok: false, reason: v.reason ?? 'verification failed' }
    const p = v.payload

    const intents = this.listIntents()
    const intent = intents.find((i) => i.intentRef === p.intentRef)
    if (!intent) return { ok: false, reason: 'unknown intent_ref — rejected' }

    const sales = this.listSales()
    const existing = sales.find((s) => s.processor === intent.processor && s.processorTxnId === p.processorTxnId)

    if (p.eventType === 'refund' || p.eventType === 'chargeback') {
      // Revocation disables future access; it cannot un-deliver already-downloaded
      // media (honest: traceability via the watermark, not DRM).
      const status: SaleStatus = p.eventType === 'refund' ? 'refunded' : 'chargeback'
      if (existing) {
        existing.status = status
        this.writeJson(SALES_KEY, sales)
      }
      intent.status = p.eventType === 'refund' ? 'refunded' : 'chargeback'
      this.writeJson(INTENTS_KEY, intents)
      return { ok: true, sale: existing }
    }

    if (existing) return { ok: true, sale: existing } // duplicate/retried sale postback → idempotent

    if (p.grossAmountMinor < intent.priceMinor) return { ok: false, reason: 'underpayment — held, not unlocked' }
    if (p.currency !== intent.currency) return { ok: false, reason: 'currency mismatch — held' }

    const saleId = uuid()
    const sale: Sale = {
      saleId,
      intentRef: intent.intentRef,
      galleryId: intent.galleryId,
      processor: intent.processor,
      processorTxnId: p.processorTxnId,
      grossAmountMinor: p.grossAmountMinor,
      currency: p.currency,
      buyerTokenHash: p.buyerTokenHash,
      paidAt: p.paidAt,
      recordedAt: new Date().toISOString(),
      watermarkId: this.watermarkId(p.buyerTokenHash, intent.galleryId, saleId),
      status: 'paid',
    }
    sales.push(sale)
    this.writeJson(SALES_KEY, sales)
    intent.status = 'consumed'
    this.writeJson(INTENTS_KEY, intents)
    return { ok: true, sale }
  }

  // --- sandbox affordances (mock processor only) ---

  /** Run the entire mint → pay → verify → unlock flow with a fabricated buyer. */
  simulateSale(galleryId: string): ProcessResult {
    if (!this.processor.simulatePostback) return { ok: false, reason: 'not a sandbox processor' }
    const buyerTokenHash = 'btk_' + fnvHex('buyer-' + uuid())
    const { intent } = this.startCheckout(galleryId, buyerTokenHash)
    const signed = this.processor.simulatePostback(intent, { processorTxnId: 'txn_' + uuid().slice(0, 12), paidAt: new Date().toISOString() })
    return this.processPostback(signed)
  }

  /** Simulate a refund/chargeback on an existing sale to exercise revocation + the VAMP monitor. */
  disputeSale(saleId: string, type: 'refund' | 'chargeback'): ProcessResult {
    const sale = this.listSales().find((s) => s.saleId === saleId)
    const intent = sale ? this.listIntents().find((i) => i.intentRef === sale.intentRef) : undefined
    if (!sale || !intent || !this.processor.simulatePostback) return { ok: false, reason: 'no such sale / not a sandbox processor' }
    const signed = this.processor.simulatePostback(intent, { processorTxnId: sale.processorTxnId, paidAt: new Date().toISOString(), event: type })
    return this.processPostback(signed)
  }

  evidenceKit(saleId: string): EvidenceKit | null {
    const sale = this.listSales().find((s) => s.saleId === saleId)
    if (!sale) return null
    return {
      generatedAt: new Date().toISOString(),
      note: 'Chargeback representment evidence — Pink Battleship. The per-buyer watermark ties any leaked copy to this buyer (traceability, not DRM).',
      sale,
      intent: this.listIntents().find((i) => i.intentRef === sale.intentRef) ?? null,
    }
  }

  vampStats(): VampStats {
    const sales = this.listSales()
    const disputes = sales.filter((s) => s.status === 'chargeback').length
    const ratioPct = sales.length ? Math.round((disputes / sales.length) * 1000) / 10 : 0
    return { sales: sales.length, disputes, ratioPct }
  }
}

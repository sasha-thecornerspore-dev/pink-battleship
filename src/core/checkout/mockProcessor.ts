import type { CheckoutIntent } from '@shared/models'
import type { Processor, CheckoutSession, PostbackPayload, SignedPostback, VerifyResult } from './processor'

/**
 * A sandbox processor for the local build-out. Its "signature" is a deterministic
 * stub — NOT real cryptography — purely so the verify → reconcile → unlock flow is
 * exercisable offline with nothing leaving the machine. The real CCBill / Segpay /
 * Verotel / crypto adapters implement the same Processor interface with genuine
 * hosted checkout + HMAC verification; this is the seam they drop into.
 */

const SANDBOX_SECRET = 'pb-sandbox-not-a-real-secret'

/** Order-stable serialization so the stub signature is deterministic. */
function canonical(p: PostbackPayload): string {
  return [p.intentRef, p.processorTxnId, p.grossAmountMinor, p.currency, p.buyerTokenHash, p.eventType, p.paidAt].join('|')
}

/** A tiny non-crypto hash (FNV-1a) → hex. Stand-in for a real HMAC; sandbox only. */
function stubHashHex(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

function stubSign(payload: PostbackPayload): string {
  return 'sbx_' + stubHashHex(SANDBOX_SECRET + '|' + canonical(payload))
}

export class MockProcessor implements Processor {
  readonly id = 'mock' as const
  readonly kind = 'mor' as const

  createCheckout(intent: CheckoutIntent, opts: { now: string }): CheckoutSession {
    const expiresAt = new Date(new Date(opts.now).getTime() + 30 * 60_000).toISOString()
    return {
      checkoutUrl: `pbmock://checkout/${intent.intentRef}`,
      processorRef: 'mref_' + intent.intentRef.slice(0, 12),
      expiresAt,
    }
  }

  verifyCallback(signed: SignedPostback): VerifyResult {
    if (!signed || !signed.payload) return { ok: false, reason: 'malformed postback' }
    if (stubSign(signed.payload) !== signed.signature) return { ok: false, reason: 'signature mismatch' }
    return { ok: true, payload: signed.payload }
  }

  simulatePostback(
    intent: CheckoutIntent,
    opts: { processorTxnId: string; paidAt: string; event?: 'sale' | 'refund' | 'chargeback'; amountMinor?: number; currency?: string },
  ): SignedPostback {
    const payload: PostbackPayload = {
      intentRef: intent.intentRef,
      processorTxnId: opts.processorTxnId,
      grossAmountMinor: opts.amountMinor ?? intent.priceMinor,
      currency: opts.currency ?? intent.currency,
      buyerTokenHash: intent.buyerTokenHash ?? '',
      eventType: opts.event ?? 'sale',
      paidAt: opts.paidAt,
    }
    return { payload, signature: stubSign(payload) }
  }
}

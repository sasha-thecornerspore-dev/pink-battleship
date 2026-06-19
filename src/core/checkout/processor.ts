import type { CheckoutIntent, ProcessorId } from '@shared/models'

/**
 * The single interface the app codes against for paid-gallery checkout. Each
 * real IPSP (CCBill / Segpay / Verotel / BTCPay / NOWPayments) becomes a
 * swappable adapter behind this port — no vendor is hardcoded. The desktop is
 * the SOLE release authority: it re-verifies the processor's own signed
 * postback (verifyCallback) before unlocking anything. See
 * docs/paid-galleries-design.md.
 *
 * The sandbox MockProcessor is the only adapter that ships today; live adapters
 * (real hosted checkout + HMAC verification + the thin hosted component) plug in
 * here later. Nothing in this build reaches the network.
 */

export type ProcessorKind = 'mor' | 'gateway' | 'crypto'
export type PostbackEvent = 'sale' | 'refund' | 'chargeback'

export interface CheckoutSession {
  checkoutUrl: string
  processorRef: string
  expiresAt: string
}

/** The processor's signed evidence of a payment event — the trust anchor the desktop re-verifies. */
export interface PostbackPayload {
  intentRef: string
  processorTxnId: string
  grossAmountMinor: number
  currency: string
  buyerTokenHash: string
  eventType: PostbackEvent
  paidAt: string
}

export interface SignedPostback {
  payload: PostbackPayload
  signature: string
}

export interface VerifyResult {
  ok: boolean
  reason?: string
  payload?: PostbackPayload
}

export interface Processor {
  id: ProcessorId
  kind: ProcessorKind
  /** Build the hosted-checkout link + the public processorRef. Live adapters sign with the merchant secret (vault-only). */
  createCheckout(intent: CheckoutIntent, opts: { now: string }): CheckoutSession
  /** Re-verify a signed postback. Live adapters check the real HMAC/signature; only ok=true ever leads to a release. */
  verifyCallback(signed: SignedPostback): VerifyResult
  /**
   * SANDBOX ONLY — produce a signed postback as if a buyer had paid, so the full
   * mint→pay→verify→unlock flow is exercisable offline. Live processors do this
   * server-side; real adapters leave this undefined.
   */
  simulatePostback?(intent: CheckoutIntent, opts: { processorTxnId: string; paidAt: string; event?: PostbackEvent; amountMinor?: number; currency?: string }): SignedPostback
}

# Paid Galleries & Checkout — Design & Threat Model

**Status:** The **local side is BUILT (sandbox)** — `src/core/checkout/` ships the `Processor` port, a sandbox `MockProcessor`, the desktop-authoritative verify → reconcile (amount/currency) → single-use → unlock flow, the per-buyer watermark token, the chargeback evidence kit, the VAMP dispute monitor, and the **Sales** screen (publish a gallery, simulate sale/dispute, export evidence). **NOT built** (still needs the founder decisions in §9a/§6a/Risk #1/#2/#6): the **live processor adapters** (CCBill/Segpay/Verotel/BTCPay/NOWPayments hosted checkout + real HMAC verification) and the **thin hosted component**. They drop in behind the same `Processor` interface — nothing in the shipped build reaches the network. This document is the first-class specification for the Paid Galleries & Checkout feature (§4.5) and its thin hosted component (§9a). It is written to the blueprint's assist-only, local-first defaults and to its honesty bounds (`[BET]` desktop DRM is a myth; representment reduces, does not win, disputes). It does not resolve the open founder calls it depends on (Risk #1/#2/#6); it specifies the feature so those calls can be made with eyes open.

### TL;DR

- **The desktop is the only authority that can release media.** The processor's own signed postback is the non-forgeable proof of payment, and the desktop **re-verifies it independently** before delivering anything. The hosted component is a relay and freshness wrapper, never a release authority — the load-bearing correction to the earlier draft, which let the host mint the trusted unlock.
- **The app never touches card data.** Every sale runs through the creator's own adult-specialist IPSP as merchant-of-record (CCBill / Segpay / Verotel-CardBilling) or self-hosted/crypto rail (BTCPay / NOWPayments), so there is no PCI-DSS burden and no chargeback liability on the creator's own bank. This is entirely independent of OnlyFans/Fansly, which are assist-only and never a checkout rail (Risk #1).
- **Multi-processor + crypto failover is a Must** — a single processor ban is the industry's #1 income-failure mode (§6). Crypto rails carry no card-network chargebacks, so they both protect the VAMP ratio and survive a card-network ban entirely.
- **Leaks and disputes are the same problem viewed twice** — both are won by *traceability, not DRM*. Every paid delivery is per-buyer watermarked (visible hashed token + optional forensic mark), logged, and bundled into a pre-assembled compelling-evidence kit, directly defending the **1.5% VAMP dispute threshold** (NA/EU/APAC since Apr 1 2026, ~$8/dispute above it; A15).
- **Five trust boundaries, each independently authenticated.** Nothing assumes a trustworthy network, clock, or inbound caller — including the payment processor. A hosted-component compromise exposes no logins, no vault, no explicit media of record, no minting key, and no buyer-identifying data.
- **This feature is the single deliberate exception to "everything local"** (§9a, §14), and its new egress paths are declared, field-by-field, to the "what leaves your machine" data-flow inspector (§4.15, §14) — a live payload-vs-schema diff, not a static attestation.

---

## Trust model at a glance

| Tier | Role | Holds | Never holds |
|---|---|---|---|
| **Desktop app** | **Source of truth + sole authorizer of delivery.** Mints checkout URLs, signs gallery links, re-verifies every processor signature, runs all per-buyer rendering, is the system of record and the reconciler. | Credential/API vault (OS keychain), master/watermarked media, signing key, buyer-token keying secret, canonical SQLite ledger, webhook-verification material (for independent re-verify) | — |
| **Thin hosted component (§9a)** | **Stateless-where-possible, minimal-data, no-credential relay**, per-creator-scoped, reached only by **desktop-initiated outbound poll**. Receives webhooks, caches signed evidence briefly, serves the SFW landing page + previews + expiring signed-URL plumbing. | Webhook *verification*-grade secret (first-pass only), desktop's *public* key, two required durable exceptions: a replay-nonce cache and an idempotency/dedupe ledger (both per-creator namespaced) | Platform logins, credential vault, merchant/API secrets, raw explicit media of record, 2257 records, minting key, buyer-key, media-signing capability, buyer identity |
| **Processor** | **Merchant-of-record** (cards) or confirmed-payment authority (crypto). Owns card data and buyer identity; emits the signed postback that is the trust anchor. | PAN/card data, buyer email/name, the canonical transaction record | The desktop's keys; anything the app holds |

The asymmetry is deliberate and is what makes flat solo pricing viable (§6a): the expensive, high-liability custody (card data, media, identity) lives with the processor and the creator's own machine, never with us.

---

## Architecture

The flow spans three actors — the **Desktop app** (source of truth), the **Thin Hosted Component** (per-creator-scoped relay, per §9a/§14), and the **Processor** (CCBill/Segpay/Verotel-CardBilling as MoR for cards + NOWPayments/BTCPay for crypto). Explicit renditions never leave the machine until the buyer is proven paid by *the processor's own signed evidence*; the hosted half only ever sees signed-URL plumbing and SFW landing assets.

**Trust anchor (read first).** The non-forgeable proof of payment is the **processor's own signed postback**, which the desktop **re-verifies independently**. The hosted component is a *relay and freshness wrapper*, **not** an authority that can authorize a release. This is the load-bearing correction to the earlier draft, which let the host mint the trusted unlock — meaning a host compromise could forge a release. It now cannot: the worst a compromised host can do is replay or drop relays, both of which the desktop detects (re-verification + reconciliation).

### State ownership (who holds what)

| State | Desktop | Hosted | Processor |
|---|---|---|---|
| Master/watermarked media | ✅ source of truth | ❌ never | ❌ |
| Desktop signing keypair (signs **desktop-issued** gallery links only) | ✅ private key (vault) | ✅ public key only | ❌ |
| Processor **merchant/API** creds (mint checkout URLs, call reconciliation API) | ✅ vault only | ❌ never | ✅ |
| Processor **webhook-verification** material (digest salt / sig key) | ✅ vault (for independent re-verify) | ✅ copy (first-pass verify only) | ✅ owns |
| `intent_id` (local PK) | ✅ canonical (SQLite) | ❌ never sees it | ❌ |
| `intent_ref` (public 128-bit passthrough token) | ✅ issues | ⏳ ephemeral pending-unlock cache | ✅ echoes back in postback |
| Consumed/replay ledger (`jti`, `processor_txn_id` uniqueness) | ✅ canonical | ❌ (stateless, cannot enforce) | ❌ |
| Raw processor-signed postback (chargeback evidence) | ✅ persisted | ⏳ until pulled, then TTL-purged | ✅ |
| Card / PAN data | ❌ | ❌ | ✅ only |
| Buyer email / name | ❌ (HMAC token only) | ❌ never | ✅ only |

**Two classes of processor secret** — the prior draft conflated them, and the distinction is the spine of the whole boundary.

1. **Merchant/API secrets** mint checkout URLs and call reconciliation APIs. They live **only** in the desktop OS keychain and **never** touch the host. (This part of the §9a "all signing on desktop" promise stands.)
2. **Webhook-verification material** (CCBill dynamic-key/MD5 salt, Segpay/Verotel-CardBilling signature key) is a distinct, lower-value *processor secret of record*. There is no way to verify a webhook server-side without the shared secret, so the host **necessarily holds the verification side** for a first-pass check. We therefore state plainly: the component holds a **minimal, per-creator, verification-scoped secret**, encrypted at rest and per-creator-scoped, and we **assume its compromise can forge an inbound "paid" relay for that one creator** — which is *exactly why the desktop holds the same material and re-verifies the processor signature itself before releasing anything.* Where a processor distinguishes a sign-only vs verify-only key, use the narrower one. The host is never trusted as the final word.

A third secret — the **buyer-token keying secret** (used to compute the watermark token / `buyer_handle`) — is kept on the **desktop only** and never shipped to the host (see Privacy & data flow).

### End-to-end flow (card processors)

1. **Mark paid.** Creator flags a gallery/asset paid in-app. The desktop creates a local `CheckoutIntent`: `intent_id` (UUIDv7, local PK, **never leaves the machine**), `intent_ref` (128-bit random, unguessable, the only id exposed to processor/host), `asset_set_id`, `price`, `currency`, `processor`, `creator_id`, `status=pending`.
2. **Mint signed checkout URL.** The desktop builds the processor-specific hosted-checkout link (CCBill FlexForms / Verotel-CardBilling FlexPay signed-URL / Segpay), signing the payload with the processor's *merchant secret* (vault-only) and attaching `intent_ref` as the round-trip passthrough. **`intent_id`, price-signing secrets, and merchant creds never reach the processor page or the host.**
3. **Buyer pays** on the processor's hosted page. App and host touch no card data → no PCI-DSS burden.
4. **Server-side postback.** The processor fires its webhook to the host endpoint `/hooks/{processor}` (TLS, **source-IP allowlisted** to the processor's published ranges, timestamp-tolerance window to absorb retries without accepting stale replays). The host does a **first-pass** verify with the processor's webhook scheme, then caches the **raw signed payload** keyed by `intent_ref`. The host does **not** mint a trusted token — it relays the processor's evidence verbatim.
5. **Cache + expose.** The host stores `{ intent_ref, processor, processor_txn_id, amount, currency, paid_at, raw_signed_postback }` in its ephemeral cache and exposes it on a **per-creator-scoped, bearer-authenticated** pull endpoint. No buyer email/name is stored (data-minimization, §9a).
6. **Desktop learns, re-verifies, releases.** The desktop polls `GET /unlocks?since=cursor` with its enrolment **bearer token** (creator_id alone is never sufficient). For each entry it:
   a. **independently re-verifies** the raw processor signature against its own copy of the webhook-verification material (the host is not trusted);
   b. resolves `intent_ref` → an **open** local intent it actually created (unknown/closed `intent_ref` → reject + log);
   c. asserts **`amount ≥ intent.price` and `currency == intent.currency`** (mismatch → hold, never release);
   d. enforces single-use via a **uniqueness constraint on `(processor, processor_txn_id)`** in local SQLite (the consumed ledger lives here — a stateless host cannot enforce this);
   e. on pass: marks the intent `paid`, persists the raw signed postback as chargeback evidence, generates the **per-buyer watermarked** rendition (visible HMAC buyer token + optional forensic mark), and serves it via a short-lived desktop-signed gallery link.
   The chargeback evidence kit records delivery proof, access logs, and provenance against `processor_txn_id`; dispute outcomes feed the **VAMP-ratio monitor** (1.5% threshold, A15).

### Crypto path (NOWPayments / BTCPay) — distinct finality model

Crypto has **no chargeback and no HMAC postback**, so it does **not** reuse the card lifecycle. NOWPayments relays an IPN (verified by its own HMAC); self-hosted BTCPay authenticates via its API key / greenfield webhook. Release gates on an **on-chain confirmation threshold** (configurable per coin/amount), not a card-style signature. There is **no `refunded`/`chargeback` revocation branch** (finality is one-way); the watermark remains the post-hoc traceability tool. The host's role is identical: relay the processor's signed/confirmed event; the desktop re-verifies and applies the same amount/currency and single-use checks.

### Unlock relay object & lifecycle

The host relays a compact object that **wraps** (does not replace) the processor's signed evidence. The wrapper's purpose is freshness/replay-window only — **it is never the release authority**:

```
{ intent_ref, processor, processor_txn_id,
  amount, currency,
  buyer_token = HMAC(creator_local_secret, buyer_email)   // keyed, irreversible; raw email never travels
  paid_at, nonce, jti,
  raw_signed_postback                                       // the actual trust anchor, re-verified by desktop
  // host wrapper exp ~15m bounds RELAY freshness only — NOT the buyer's right to delivery
}
```

**Critical fix vs. prior draft:** the wrapper `exp` bounds only how long a *cached relay entry* is considered fresh; it does **not** gate release eligibility. A desktop app is routinely closed for hours or days, so if `exp` gated the buyer's right to receive paid content, every offline creator would fall through to reconciliation as the *default* path. Because the durable proof is the processor-signed postback (which has no short expiry), a buyer who paid is always entitled to delivery whenever the desktop next reconciles — even long after any wrapper expired.

**Lifecycle (card):** `pending → paid → consumed → refunded/charged_back`. `consumed` is recorded by the local uniqueness constraint, not by the host. A `refund`/`chargeback` postback flips local status and **disables future gallery-link issuance** — it **cannot un-deliver already-downloaded media** (honest per §6: traceability, not DRM); the per-buyer watermark is the post-hoc recourse. Gallery links are desktop-signed, separate, and shorter-lived than the unlock (low-res preview pre-pay; watermarked full-res post-pay), each with its own `exp` and buyer-scoped claim.

### Staying in sync without the host being an authority

- **Asymmetric trust, corrected.** Merchant/API secrets live **only** in the vault. The host holds webhook-verification material (so it can do a cheap first-pass) **and** the desktop's *public* key — but **mints nothing the desktop trusts blindly**. The desktop re-verifies the processor signature itself, so a host compromise cannot forge a release, cannot mint checkout URLs (no merchant secret), and cannot read the vault. The host *can* drop or replay relays — both caught by re-verification + reconciliation.
- **Desktop is reconciler and the true backstop.** If a postback is missed, the host is down, the cache TTL lapses before the desktop comes online, or the desktop is offline past the relay window, the desktop reconciles open intents against the processor's transaction API/CSV (*solo-merchant API access is itself an assumption — cf. A3; confirm per processor*). Reconciliation, **not** catching the ephemeral cache entry, is the guaranteed path; the relay is best-effort acceleration.
- **Idempotency.** The dedupe key is **`(processor, processor_txn_id)`** (primary), with `intent_ref` as the intent-binding check — so duplicate/retried postbacks and any replayed wrapper collapse to one release.
- **Failure modes.** Host down → buyer still completes payment on the processor; the desktop reconciles and releases late (no lost sale, even if the wrapper expired). Single-processor ban → other processor / crypto intents stay live (multi-processor is the #1 income-failure guard). Stale wrapper → ignored; durable postback still honored. Refund race → revocation supersedes any cached `paid` for *future* access. Push notifications, if added later, must be **desktop-initiated** (outbound SSE/long-lived WS the desktop opens to the host) — never host-initiated inbound, since the desktop is typically behind NAT.

**Open decision (Risk #2 / Risk #6):** whether *we* host the thin component or the creator brings their own — either way its contract is identical (**stateless where possible, per-creator-isolated, minimal-data, no merchant/API credential, never a release authority**). In the we-host case, per-creator endpoint isolation and a zero-PII cache bound the blast radius the blueprint's complicity concern (Risk #6) worries about: a host breach exposes neither logins, the vault, explicit media, nor buyer identities — only short-lived, already-signed, amount-level relay records the desktop re-verifies anyway.

---

## Processor integration & failover

The app's job is narrow: mint a **signed checkout intent**, hand it to a processor's hosted page, and unlock the gallery only when the thin hosted component (§9a) **verifies a server-side webhook/postback AND reconciles it against the persisted intent.** Every paid-gallery sale runs through the **creator's own adult-specialist IPSP** acting as **merchant-of-record (MoR)** or hosted gateway, so there is no PCI-DSS burden, no card vault, and no chargeback liability landing on the creator's own bank. This is independent of OnlyFans/Fansly (assist-only, never a checkout rail — Risk #1): a paid gallery is sold through the creator's CCBill/Segpay/Verotel/crypto account, not through any subscription platform.

### One internal Processor port, per-processor adapters

Define a single `Processor` interface the rest of the app codes against; each IPSP is a swappable adapter, so no one vendor is hardcoded (A3/A4).

```
interface Processor {
  id: "ccbill" | "segpay" | "verotel" | "btcpay" | "nowpayments"
  kind: "mor" | "gateway" | "crypto"
  createCheckout(intent): { checkoutUrl, processorRef, expiresAt }
  verifyCallback(rawPayload, headers): {
      ok,                  // signature/HMAC verified AND replay-window ok
      processorRef,
      entitlementKey,      // = hash(galleryId + buyerTokenHash): the unlock identity, stable across processors
      buyerTokenHash,      // echoed back from intent pass-through (correlate by processorRef if absent)
      eventType,           // "sale" | "rebill" | "refund" | "partial_refund" | "chargeback" | "reversal" | "reserve_release"
      grossAmountMinor, currency,
      refundedAmountMinor, // for refund/partial_refund/chargeback
      feeEstimate, feeReversal,
      status, isRebill
  }
  feeModel: {
      effectiveDate, sourceNote,        // DATED estimate (A3/A4), never hardcoded in prose
      pctRange, fixedFee, reservePct, reserveHoldMonths, fxSpread
  }
}
```

`CheckoutIntent` carries: `galleryId`, `productSku`, `priceMinor`, `currency`, `buyerTokenHash` (SHA-256 of buyer email + **per-creator secret salt** — the value watermarked, never raw email), `nonce`, `returnUrl`, `expiresAt`. The signed intent is **persisted server-side** at `createCheckout` time so the callback can be reconciled against it.

**On `buyerTokenHash` (honest caveat).** This hash exists for **leak traceability and cross-purchase identity stitching, not buyer privacy.** Email space is enumerable, so the hash is reversible by dictionary attack if the salt leaks, and a static per-creator salt deliberately makes one buyer linkable across purchases. The salt is therefore a **per-creator secret held on the desktop only**, never on the hosted component, and the UI never presents the hash as anonymizing the buyer. (The privacy-stronger alternative — an *opaque random handle* rather than a hash of email — is specified under Privacy & data flow; it is the recommended token model, and this section's hash form is the lower bound on what must never be claimed as anonymizing.)

### Callback verification (authoritative rules)

`verifyCallback` returns `ok` only when ALL hold:

1. **Signature/HMAC verifies** against the per-creator verification secret (FlexPay signature / CCBill–Segpay shared-secret HMAC). This is the **sole authority.** IP allowlists are **defense-in-depth only** — processor egress IPs rotate, so an allowlist must never be the only gate.
2. **Replay window** — the postback timestamp is within a bounded skew, and the `nonce` is consumed from a **server-side single-use store** (client-side `expiresAt` is cosmetic; expiry and single-use are enforced server-side).
3. **Intent reconciliation** — `grossAmountMinor`, `currency`, and the resolved `productSku`/`galleryId` **match the persisted CheckoutIntent.** A mismatch (under-payment, SKU-swap, gallery-swap) is rejected and flagged, never unlocked. This closes the amount/SKU-tampering hole.

Unlock is then keyed on **`entitlementKey = hash(galleryId + buyerTokenHash)`**, not `processorRef` — so the same buyer/gallery resolves to one entitlement regardless of which processor settled it.

### Missed-webhook recovery (the common real failure)

A buyer can be charged while the webhook is dropped (outage, restart, network). Therefore:

- The hosted component runs a **reconciliation poll** (CCBill datalink / processor transaction-query / crypto invoice-status) to backfill unlocks for which a charge exists but no webhook landed.
- A buyer-facing **"I paid but have no access"** recovery path re-checks by `processorRef`/intent and unlocks if a verified, reconciled charge is found.
- Webhooks are treated as best-effort delivery; the poll is the safety net. (The authoritative trigger remains the desktop independently polling the processor's transaction-query API on a schedule — a processor that never POSTs us still results in correct delivery.)

### Crypto failover

**BTCPay (self-hosted, 0% fee)** and NOWPayments (~0.5%, custodial-light) are first-class adapters, not afterthoughts. Crypto has **no card-network chargebacks**, so it both protects the VAMP ratio and survives a card-network ban entirely. BTCPay emits an invoice webhook the same `verifyCallback` shape consumes. Crypto-specific settlement rules (not glossed):

- Unlock waits for **confirmed** (a configured confirmation count per asset), never merely detected/mempool.
- **Underpayment / overpayment / invoice-expiry** are explicit states: underpaid → not unlocked, buyer prompted to top-up or refunded; expired → re-mint.
- "No chargebacks" means no card-network dispute; it does **not** mean zero risk — buyer-side exchange recalls and custodial-light counterparty risk (NOWPayments) still exist and are surfaced, not hidden.

### Failover state machine

Each processor adapter has a health state: `active | degraded | banned`. **Observable** triggers (a solo under hosted MoR usually does NOT see per-auth declines, so decline-rate is not a primary signal): postback **HMAC/verification-failure** rate, webhook **4xx/5xx** rate, **KYC-revoked / account-freeze** notice, or **manual creator flag.** On `createCheckout`, the router walks the creator's ordered preference list, skipping non-`active` adapters; if the primary card processor is `banned`, it transparently falls through to the secondary card processor, then to crypto, and **alerts** the creator ("CCBill checkout is down — falling back to Segpay") rather than silently failing the sale.

**VAMP-aware routing (A15).** This is not only a ban-response machine. The router tracks the **rolling dispute ratio** and, as it approaches the **1.5% VAMP threshold** (in effect since Apr 1 2026; ~$8/dispute above threshold), **proactively biases new checkouts toward no-chargeback crypto rails** — protecting the ratio *before* a ban, not after.

**Configuration gate (reconciled with onboarding reality + Risk #2).** Resilience wants ≥1 card processor **plus** ≥1 crypto adapter, since a single card-processor ban is the #1 income-failure mode. But CCBill/Segpay MoR approval takes days, so we do **not** hard-block a creator who has crypto ready on day one: **crypto-only checkout is enabled immediately**, the card processor runs as a parallel onboarding track, and the UI **surfaces the single-rail risk** ("you have no card fallback yet") rather than refusing checkout. The whole gate presumes the thin hosted component exists, which **Risk #2 (we-host vs creator-hosts) must resolve first** — flagged, not assumed.

### Onboarding / KYC for a solo

CCBill and Segpay onboard a solo creator as MoR **without her own acquiring bank** — realistic in days, not instant. Verotel (EMI) and self-hosted BTCPay need more setup. The app ships a per-processor onboarding checklist and stores only the resulting merchant/sub-account ID + **verification secret** (in the OS keychain on desktop; verification-scoped copy on the hosted component), never card-acquiring credentials or the merchant portal login.

### Net back into the P&L engine

`verifyCallback` returns `grossAmountMinor` and a `feeEstimate` computed from the adapter's **dated** `feeModel` (carrying `effectiveDate` + `sourceNote`) — **all configurable, dated estimates (A3/A4), never hardcoded in code or prose.** Indicative ranges are stored as data, not baked in (CCBill, Segpay, Verotel, and crypto rates per A3/A4; CardBilling's claimed flat rate treated as unconfirmed per A4). The engine records gross, estimated processor fee, **held reserve** (`reservePct` over `reserveHoldMonths`, feeding the §4.7 cash-flow forecast), and FX spread per event, distinguishing **eventType** (sale / rebill / refund / partial_refund / chargeback / reversal / reserve_release) with signed amounts and fee reversals, then reconciles against the real payout statement on import so net P&L converges from estimate to actual.

**Failure modes to handle:**

- **Duplicate/replayed webhooks** — idempotency on `processorRef` for de-dup, but the **entitlement** is idempotent on `entitlementKey` so cross-processor double-settles (old banned link + re-minted fallback both paid) resolve to one unlock; the second settle is recorded as an overpayment/refund candidate, not a second grant.
- **Out-of-order rebill events** — ordered by processor event timestamp, not arrival order.
- **Partial refunds, chargebacks, reserve clawbacks** — first-class `eventType`s with `refundedAmountMinor`/`feeReversal`, flowing into net P&L and the cash-flow forecast.
- **Banned processor with in-flight links** — re-mint on the fallback before expiry, but assume the **old link may still settle**; entitlement idempotency (above) prevents a double-grant, and any duplicate charge is surfaced for refund.
- **Missed webhook** — covered by the reconciliation poll + buyer recovery path above.

---

## Threat model

Paid Galleries spans **five** trust boundaries (the prior draft counted three and omitted two real ones). Each is crossed by attacker-controllable input, so each gets its own authentication, authorization, and replay defense. Nothing in this flow assumes a trustworthy network, a trustworthy clock, or a trustworthy inbound caller — including the payment processor.

**Design invariants (hold these across the whole flow):**

- **The desktop is the only minter and the only thing that can authorize delivery.** It holds the per-creator HMAC key, the buyer-token keying secret, and the media-access capability. The hosted component holds none of these.
- **The desktop never accepts inbound connections.** All desktop↔component traffic is **desktop-initiated outbound long-poll** (the desktop pulls confirmed events; the component cannot reach the desktop, has no desktop address, and exposes no callback into it). This keeps the source of truth off the public attack surface.
- **Delivery never *depends* on an inbound postback.** Postbacks are latency optimizations; the authoritative trigger is the desktop independently polling the processor's transaction-query API on a schedule. A processor that never POSTs us still results in correct delivery.
- **The hosted component is per-creator-scoped and minimal-state.** It is "stateless where possible," but two pieces of durable per-creator state are *required* and are the explicit exceptions: the **replay-nonce cache** and the **idempotency/dedupe ledger** (below). Both are namespaced per creator so one creator's data and one creator's compromise cannot touch another's.

**Trust boundaries**

1. **Buyer ↔ processor (CCBill/Segpay/Verotel-CardBilling/NOWPayments/BTCPay).** Untrusted public internet. The processor (MoR) owns card data; the app and hosted component never see a PAN — no PCI-DSS scope. Card fraud and 3DS are the processor's problem; ours begins at the postback.
2. **Processor ↔ hosted component (§9a).** The processor POSTs a webhook/postback to a per-creator endpoint. Highest-value forgery target: a spoofed "payment succeeded" tries to mint an unlock for free.
3. **Hosted component ↔ desktop.** The desktop is the source of truth and the only authorizer of delivery; the component is stateless, minimal-data, no-platform-credential plumbing reached only by desktop-initiated outbound poll.
4. **Desktop ↔ zero-knowledge sync / read-only companion PWA (§13) / VA shared layer (§4.12).** A scoped, encrypted subset of state replicates to a phone or a VA's second machine. This channel carries **no minting key, no buyer-token secret, and no media-access capability** — it is read-only projection. Compromise of a synced device exposes the synced subset (ciphertext only to the provider; plaintext to whoever holds that device's unlock) but cannot authorize a delivery or forge a checkout.
5. **Owner ↔ emergency controls (§4.15).** The kill switch / remote-wipe-on-next-launch token is itself a destructive capability and is modeled as one (see Desktop compromise).

**STRIDE walk**

- **Checkout-link forgery / replay (Tampering, Elevation).** The desktop mints a signed checkout URL: `{galleryId, buyerTokenHash, priceCents, currency, exp, nonce, creatorId}` + HMAC-SHA256 over a per-creator key held *only* on the desktop. The component verifies the MAC, then rejects on `exp` past or a seen `nonce`. Replay defense: a **durable, per-creator-namespaced nonce cache** (TTL = link lifetime) that survives component restart and is consistent across all instances (no in-memory-only cache, no cross-creator shared namespace). Mitigations: short `exp` (minutes); single-use nonce; **amount and currency bound into the signature** so price can't be edited — *and* reconciled again at delivery (below) so a link can't be paired with a mismatched payment.
- **Webhook spoofing / replay (Spoofing).** Verify the processor's signature (CCBill datalink digest / Segpay / Verotel-CardBilling postback hash) against the per-creator shared secret. Enforce a **±5-min window on the *processor's* timestamp** (not local wall-clock alone), and require an **idempotency key = processor transaction id** deduplicated against a **durable per-creator idempotency ledger** so a replayed "paid" postback unlocks exactly once. This ledger is the deliberate stateful exception to "stateless"; it stores only `{txnId, creatorId, status, firstSeen}` — no PII beyond the txn reference.
  - **Secret custody & rotation.** The per-creator webhook secret is provisioned by the desktop, pushed to the component over the authenticated outbound channel, and **rotatable on demand.** On any suspected component compromise the secret is rotated and re-registered with the processor; in-flight postbacks under the old secret are rejected. The component holds *verification*-grade secrets only — never the desktop's minting key.
  - **Unsigned legacy postbacks are zero-trust hints, never triggers.** Some processors send unsigned legacy postbacks. These are IP-allowlisted to the processor's published ranges **and** treated as advisory-only: they may *nudge* a reconfirm but never cause delivery. Reconfirms are themselves **rate-limited and deduped per `{creatorId, txnId}`** so a forged flood can't exhaust the processor's transaction-query quota or run up API billing. Because the desktop already polls the processor on a schedule, delivery is correct even if every postback is dropped or forged. (IP allowlists drift and are spoofable without edge mTLS — they are defense-in-depth, not the control.)
- **Amount/currency mismatch at confirmation (Tampering).** Before any delivery, the desktop reconciles the **confirmed event's paid amount and currency against the values bound into the minted link.** Underpayment, currency swap, partial capture, or declined-then-recaptured mismatches fail closed (no delivery, flagged for review). This closes the "valid signature, wrong amount" gap link-binding alone doesn't catch.
- **Unlock-token / delivery-URL theft (Information disclosure).** Delivery uses a **desktop-minted** short-TTL media URL (a scoped Bunny.net token or storage-signed URL) bound to `buyerTokenHash`, handed to the component as an **opaque pass-through** — the component cannot mint or forge new delivery URLs because it holds no media-signing key. The grant is a **bounded-attempt budget within a short window** keyed to `buyerTokenHash` (idempotent across HTTP range requests, CDN retries, and resumed mobile downloads — *not* a literal single HTTP request, which would falsely lock paying buyers). A stolen link past `exp` is inert. Residual: a buyer who shares a live link mid-window — bounded by short expiry + attempt budget + per-buyer watermark traceability, not prevented.
- **`buyerTokenHash` handling (Information disclosure).** `buyerTokenHash = HMAC(per-creator buyer-key, buyer identifier)` — a **keyed** hash, not a bare digest of an email (a bare hash is rainbow-table-reversible, which would leak buyer identity straight out of the watermark — the opposite of the goal). Only the **desktop** holds the buyer-key and the hash→buyer reverse map used to build the chargeback kit. The component and the watermark carry the hash only. (See Privacy & data flow for the stronger opaque-random-handle model that removes even the dictionary-attack surface.)
- **Media exfiltration (Information disclosure).** Raw explicit media of record never sits on the hosted component (§9a, §14); it stays on the creator's machine / Bunny.net. Delivery is watermarked, expiring, and previews are low-res. **DRM is a myth on desktop** — the win is **per-buyer dynamic watermarking**: a visible *hashed* buyer token plus an optional invisible forensic mark, where the forensic mark is **keyed and redundantly embedded so it survives recompression and reasonable cropping**, and is cryptographically bound to `{buyerTokenHash, txnId, deliveredAt}`. Honesty bound: the visible overlay is croppable and the forensic mark is robust-but-not-unbreakable — it makes leaks *traceable* and feeds the chargeback kit; it is not claimed as prevention. Watermark the hash, never raw email.
- **2257 / age-of-performer gate at delivery (Tampering/Repudiation/criminal-liability).** No asset ships through Paid Galleries unless it carries a **valid linkage into the §7 encrypted 2257 vault.** The "2257 link" the chargeback kit cites is therefore an *enforced delivery precondition*, not an assumed artifact: an attacker (or a misconfigured gallery) cannot induce delivery of an asset lacking a valid record. Fails closed.
- **Hosted-component compromise (Elevation).** Blast radius is deliberately small: it holds no platform logins, no credential vault, no 2257 records, no raw media of record, **no minting key, no buyer-key, and no media-signing capability.** A full takeover yields per-creator webhook *verification* secrets and checkout-grade buyer data (email, txn id) — embarrassing and a breach-notification event, but it **cannot impersonate the desktop's mint, cannot reach into the desktop (no inbound path), cannot forge new delivery URLs, and cannot release explicit masters.** Per-creator scoping caps lateral movement to one creator; per-creator namespacing of the nonce cache and idempotency ledger prevents cross-creator replay. Response: rotate that creator's webhook secret and re-register with the processor. Residual: an attacker could serve a malicious landing page or DoS one creator's checkout — see availability, below.
- **Availability / DoS of checkout (separate from processor ban).** Multi-processor + crypto failover (a Must regardless) covers a *processor ban*, not a *DoS of the per-creator endpoint or landing page* — different failures. The component sits behind edge rate-limiting and per-creator request quotas; on overload it returns a graceful "checkout temporarily unavailable — retry or use alternate rail" rather than failing into an unauthenticated path. Because delivery authority lives on the desktop (poll-based), a downed component delays but never corrupts unlocks.
- **Desktop compromise (Spoofing/Tampering).** Worst case — source of truth; holds the vault, master media, minting key, buyer-key, and media-access capability. Mitigations are the §4.15 primitives: OS-keychain secrets, encryption at rest, app-unlock (2FA/biometric/passkey), and the **kill switch / remote-wipe-on-next-launch** for a seized/stolen device. The wipe capability is *itself* modeled as a weapon: its trigger is **owner-authenticated out-of-band and is never reachable from the hosted component** (so a component compromise can't fire a destructive wipe), and the **printed/exportable recovery key survives the wipe** (§4.15). Residual risk is real and unavoidable.
- **Buyer chargeback fraud (Repudiation).** Friendly fraud directly threatens the **1.5% VAMP ratio** (in effect since Apr 1 2026, NA/EU/APAC; ~$8/dispute above threshold). Defense is layered, cheapest-first:
  1. **Stop disputes from being counted.** Integrate pre-dispute/alert rails (Ethoca / Verifi RDR / processor order-insight) and proactive refunds so eligible disputes resolve *before* a chargeback posts and counts against VAMP. Representment recovers money; it does not un-count a posted dispute.
  2. **Representment for what posts anyway.** Auto-assemble a compelling-evidence kit: watermarked-delivery proof (forensic mark bound to `{buyerTokenHash, txnId}`), **tamper-evident** signed-link access logs (hash-chained timestamps/IP), the enforced 2257 link, and the provenance trail. Self-generated logs carry limited weight with networks, so the kit leans on processor-side records and the watermark, treating self-logs as corroboration — not the centerpiece.
  3. **De-risk the highest-risk buyers** onto crypto rails (no chargebacks) and VAMP guardrails. Residual: representment win rates are never 100%.

**Cross-cutting residual risks:** processor signature-scheme drift and legacy unsigned postbacks (handled by zero-trust advisory treatment + scheduled desktop reconfirm, never by trusting the postback); **time-source integrity** — windows are enforced on the processor's own timestamp with an authenticated/monotonic local clock (don't trust unauthenticated NTP to silently widen the replay window); per-creator state (nonce cache, idempotency ledger) that *must* be durable and namespaced or replay defenses regress on restart/scale-out; and the irreducible fact that any delivered media can be screen-captured — handled by traceability and dispute defense, never by false DRM promises.

---

## Chargebacks, watermarking & evidence kit

Leaks and disputes are the same problem viewed twice: both are won by *traceability*, not DRM (the blueprint is explicit — desktop DRM is a myth, §6). Every paid delivery is stamped, logged, and bundled so a leaked file points back to one sale and a dispute can be contested with a pre-assembled compelling-evidence packet. This protects income directly: it keeps the creator under the **1.5% VAMP dispute threshold** (in effect NA/EU/APAC since Apr 1 2026, ~$8/dispute above it, A15). `[BET]` Two honesty caveats up front: forensic watermarks are **best-effort, not guaranteed** (§6), and representment **reduces, does not win, disputes** — friendly fraud on digital adult goods has structurally low win rates, so this is loss-mitigation, not a magic shield.

> **Topology dependency (Risk #2).** This section assumes the thin hosted component is the webhook receiver and signed-URL server (§9a). Whether *we host it* or *the creator brings own host* is **unresolved (Risk #2)** and changes who the GDPR data-processor is and where buyer IPs are first seen. The evidence flow below works in **either** topology: the component is a **collect-and-forget relay** (verify → derive minimal fields → push to the desktop app → retain nothing durable), and the **desktop app is the only system of record** for evidence.

### Per-buyer watermarking (traceability, not DRM)

On confirmed, signature-verified payment, the **desktop app** (source of truth, signing party) renders a per-buyer rendition from the immutable master via the bundled local media stack (ffmpeg/ImageMagick, §8) — explicit frames never leave the machine (S6). Two marks, neither of which blocks copying:

- **Visible:** a low-salience corner/tiled stamp of a *hashed* buyer token — never raw email/PII (§6). `wmText = base32(HMAC-SHA256(creatorSalt, saleId))[:12]` (≥60 bits to keep collisions negligible at catalog scale). The visible token is **deterministic and therefore forgeable from a salt leak**, so it is *not* the non-repudiation anchor — see signing below.
- **Invisible/forensic (optional, `[Should]`/best-effort):** a blind DCT/spread-spectrum payload (`watermarkId`) embedded across frames. Robustness against recompression/crop is **claimed only as best-effort**; heavy re-encode, screen-capture, crop-rescale, and AI re-generation can destroy it. The chosen embedder must be a **named, permissively-licensed library** (consistent with the blueprint's LGPL/Apache rigor, §9) — no off-the-shelf permissive *robust video* watermarker is assumed; if none clears licensing/quality, ship images-only forensic marking and treat video-forensic as **research/`[Could]`**, not a Must.

**Non-repudiation anchor (replaces "trust the token").** Per delivery the app stores `deliverySig = sign(installKey, renditionHash ‖ saleId ‖ deliveryTs ‖ watermarkId)`, where `installKey` is a per-install asymmetric key in the OS keychain. This makes each rendition's attribution **tamper-evident** and prevents replaying a leaked visible token to mis-attribute a leak to an innocent buyer.

**Salt & key management (load-bearing).**

- `creatorSalt` and `installKey` live in the **OS keychain** (§4.15), are included in the **zero-knowledge backup** (§4.11) — *without them the entire forensic/attribution capability dies on device loss* — and are covered by the **kill-switch encryption scope** (§4.15).
- **Rotation is append-only, never destructive:** §4.15 mandates one-click key rotation, but rotating `creatorSalt` would orphan every prior watermark. The catalog therefore versions salts (`saltId` per rendition); decode/verify always selects the salt that was in force at delivery.

The mapping `watermarkId → saleId → buyerRef` is stored in the encrypted SQLite catalog (SQLCipher, §9) and feeds the leak-takedown registry (§4.13). **This mapping is the single highest doxxing-risk table in the product** — it re-identifies every buyer of sexual content (GDPR Art. 9 special category, §7). Buyer identity is therefore resolved **just-in-time and logged** (only when assembling a real takedown or representment), not eagerly joined, and the table is in kill-switch scope.

### Delivery under real conditions

Local-first means the app may be **offline/asleep when the webhook fires**, and per-buyer cross-frame rendering of a multi-GB video can take minutes — but the buyer is waiting on a link *now* (§4.5). Therefore:

- **Pre-render at publish, personalize at delivery.** A watermark-ready intermediate is produced when the set is listed; on payment the app finalizes the per-buyer mark (fast image/segment-level stamp) rather than full re-encode from master.
- **App-offline path:** the thin component serves a **time-expiring holding link** (low-res preview or "your download is being prepared") and the per-buyer rendition is finalized and swapped in when the app next reconciles the webhook — delivery is *eventual*, never blocked on the app being awake, and never served un-watermarked.

### Evidence kit — recorded per sale

One `SaleEvidence` row per transaction, assembled on the desktop app from the **signature-verified** processor webhook + app-side delivery. The thin component holds none of it durably (§9a); it derives the minimal fields at the edge and forwards them.

```
saleId, processor (CCBill|Segpay|Verotel|crypto),
processorTxnRef, processorEventId (server-issued, signed — dedup key),
productSetId, amount, currency,
buyerRef (processor token, NOT card data),
buyerIpRegion (coarse region only — full IP derived at edge and DISCARDED, never logged/stored),
binCountry, purchaseTs, deliveryTs,
signedUrlId, linkExpiryTs,
accessLog[] { ts, ipRegion, uaClass, bytesServed },   // region + UA-class, not raw IP/UA string
watermarkId, wmText, saltId, renditionHash, deliverySig,
provenanceRef (§4.2 posted-where/sent-to-whom),
twoFiveSevenRef (custodian record link, §7 — link only, never the ID-of-record),
checkoutPageVersion (18+ gate, refund policy, descriptor shown, removal contact),
retentionClass, legalHold(bool)
```

`buyerIpRegion`/`accessLog` originate from the component's signed-URL serving and webhook postback; the app correlates them by `signedUrlId`. The component **derives coarse region at the edge and discards the full IP** (consistent with the Chaturbate-token discipline in the OBS addendum and §6's hash-not-PII rule). The 2257 link and provenance trail are pulled from the existing compliance module — this section *consumes* those; it never re-stores the ID-of-record.

**Privacy, retention & the erase-vs-trace tension.** These fields tie a person to a sexual-content purchase (GDPR Art. 9 / CCPA-CPRA sensitive PI, §7). The kit is therefore:

- **Minimized** (region + UA-class, not raw IP/UA; buyer token, not identity).
- **Auto-purged** on a `retentionClass` clock — dispute-defense fields expire when the processor's chargeback + re-presentment window closes, *unless* `legalHold` is set.
- **Retention conflict resolved explicitly:** a refunded or dispute-*lost* buyer's `watermarkId → saleId` mapping is **retained for leak-tracing** even after the financial record is purged (the file is already out, irreversibly), but the buyer-identity join is dropped and only the pseudonymous mapping survives. This satisfies leak-tracing without holding identity longer than needed.
- In **kill-switch / emergency-lockdown** scope (§4.15) — a seized device must not surface the buyer-resolution table.

### Representment workflow

1. **Verified webhook** `dispute.opened` arrives → the component **verifies the processor's HMAC/signature** and dedups on the server-issued `processorEventId` (not on attacker-controllable txnref) → forwards to the app → app marks the sale, opens a representment task, starts the response clock.
2. **Auto-assemble** the compelling-evidence PDF: watermarked-delivery proof (thumbnail + `wmText` + `deliverySig`), signed-link access log showing buyer-region access *post-purchase*, checkout snapshot (18+ gate, refund policy, **descriptor the buyer saw**), 2257 custodian reference (link), and provenance ("delivered once, to this buyer"). **Honesty:** region/UA evidence shows *an* accessing party, not provably the cardholder; this strengthens but does not guarantee the case.
3. **Creator reviews → submits** through the processor's portal (CCBill/Segpay dispute API or manual upload). The app **never auto-files** — draft-not-send, consistent with the assist posture (§4.4 / §5a S5). The kit assembly path is the same whether the processor exposes an API or only manual upload.
4. **Outcome** (`won`/`lost`) is recorded and feeds the VAMP guardrail.

### Staying under 1.5% VAMP

The app shows a rolling **disputes ÷ settled-transactions** proxy per processor with a yellow/red band approaching 1.5%. **This is an early-warning estimate, not the official number:** under MoR processors (CCBill/Segpay are merchant of record, §6) the VAMP-accountable entity and the precise window/pooling are the **processor's**, computed monthly at their level — the app only sees the creator's own slice. Label it as a proxy and surface the processor's stated threshold/enforcement, not just the network's.

When trending hot, the suggestion engine (§4.6) recommends mitigations: clearer billing descriptor, lower first-PPV price, slower new-buyer velocity, and **crypto failover** (BTCPay/NOWPayments — no chargebacks, §6). Crypto **removes dispute exposure entirely** (and so produces no representment path), but the **watermark + provenance + 2257 evidence still applies** to crypto sales for *leak* tracing. Any "route high-risk buyers to crypto" behavior must use a **defined, transparent, non-discriminatory** risk signal (velocity/BIN-region/first-purchase), not an opaque score, and be surfaced to the creator — it satisfies the multi-processor-failover MUST without becoming a hidden gate.

### Failure modes

- **Forensic mark destroyed** by heavy re-encode / screen-capture / AI re-gen → visible `wmText`, `deliverySig`, and `accessLog` still attribute the leak; invisible mark is **best-effort by design**, never relied on alone.
- **Forensic recovery is ambiguous** → a decoded `watermarkId` from a wild file is **corroborating evidence for a takedown, not legal proof of who leaked**; recovery can false-positive and may be manual. §4.13 treats it as a lead, not a verdict.
- **Unauthenticated / forged webhook** → reject on signature-verification failure; **never unlock or open a dispute task on an unverified postback.** Dedup on the processor's signed `processorEventId`, not on client-supplied txnref.
- **Webhook missed/replayed** → idempotent on `processorEventId`; unlock only on verified, deduped events; missed events reconciled on next app sync.
- **App offline at purchase** → holding link + deferred per-buyer finalization (above); never serve an un-watermarked rendition to bridge the gap.
- **Processor lacks an evidence API** → kit exports as PDF for manual upload; never block on automation.
- **No IP from processor** → fall back to signed-link `accessLog` (already region-only); never fabricate fields, never widen collection to compensate.
- **Salt/key lost (device loss, no backup)** → forensic/attribution capability is gone for prior deliveries; this is why salt + installKey are in the zero-knowledge backup (§4.11) and why the recovery-key warning (§4.11) applies to them too.

---

## Privacy & data flow

This feature is the **single deliberate exception to "everything local"** (§9a, §14). The desktop is the source of truth: it holds credentials, the master media, the buyer ledger, the watermark↔buyer mapping, and the signing key, and it does all per-buyer rendering. The thin hosted component is **stateless-where-possible, minimal-data, no-credential** plumbing. The rule below governs exactly what crosses that boundary.

> **Deployment assumption (gates this whole section).** Everything below is written for the **"we host the component"** branch. The **"creator brings own host"** branch (Risk #2, unresolved) changes the threat model, the controller/processor analysis, and the erasure flow — re-derive this section against whichever way Risk #2 resolves rather than treating "we host" as settled.

### What leaves the creator machine

Per checkout, the desktop emits **only** a signed checkout-intent to the creator's IPSP/hosted-checkout (CCBill FlexForms, Verotel/CardBilling FlexPay, Segpay), and a corresponding record to the hosted component:

```
POST /unlock-intent   (desktop → hosted)
{
  gallery_id:     "g_7f3…",       // opaque; NOT a human-readable title (Art.9 minimization)
  sale_token:     "sl_9a2…",      // random, single-use
  buyer_handle:   "h_4c1…",       // OPAQUE RANDOM, sale-scoped. NOT a hash of email.
                                  //   Desktop alone keeps handle→buyer mapping.
  price_cents, currency,
  issued_at, nonce,               // anti-replay (see sig)
  expires_at,                     // intent TTL (NOT the signed-URL TTL — see below)
  asset_ref_token:"art_…",        // see "Media never reachable from the component"
  sig                             // Ed25519 over canonical(all fields above); key never leaves device
}
```

**Token model (the recommended fix over the hash form).** The visible per-buyer watermark and the `buyer_handle` should be an **opaque random handle**, generated per sale, **not** `HASH(email+salt)`. A hash of email under any shared/recoverable salt is brute-forceable against a known email list and would make "cannot reverse to email" false. Instead: the desktop stores, locally only, `handle → {buyer, per-buyer random salt}`. Leak-tracing is therefore a **desktop-only** lookup; the component and the watermark carry nothing that can be reversed to a buyer without the local ledger. (Where the implementation uses the keyed-HMAC `buyerTokenHash` form instead, the threat-model bound holds — keyed, not bare — but the opaque-handle form is preferred because it removes the dictionary-attack surface entirely.)

**Signature & replay.** `sig` is **Ed25519** over a canonical serialization of the *entire* payload (including `price_cents`, `asset_ref_token`, `expires_at`, `issued_at`, `nonce`) — so none of those can be tampered in flight. The desktop's **public key is registered with the component per creator at provisioning** (and is rotatable; rotation invalidates outstanding intents). The component **rejects** intents whose `issued_at` is outside a bounded clock-skew window and **dedupes** on `sale_token` and `nonce`, so an intercepted intent cannot be replayed within its TTL.

**Webhook is the real money path and must be authenticated.** The component flips `unlock_status` **only** on a processor webhook it has cryptographically verified — per-processor signature/HMAC (CCBill, Segpay, Verotel/CardBilling each differ) **plus** source-IP allowlist, with idempotency keyed on the processor's transaction id. An unverified or unmatched webhook **never** unlocks. (Skipping this lets anyone who can POST to the component unlock galleries for free — the highest-value attack on the feature.)

**Media is never reachable from the component.** Full-res explicit media lives on Bunny.net Stream / the platforms; the component handles signed-URL *release*, not signing. The desktop pre-mints the Bunny token-auth URL (signed by a key that **never leaves the device**) and passes the component only an opaque `asset_ref_token`; the component's job is to **release that already-signed, short-TTL URL on confirmed payment**, never to mint media URLs itself. Consequently a component breach yields **no key that can mint media access** and **no asset map** (it never sees `bunny://` pointers). **Raw card data never touches the app** (MoR/hosted checkout → no PCI-DSS burden).

**Per-buyer marking is on-device and S6-bound (with a video caveat).** The per-buyer **visible opaque handle + optional invisible forensic mark** is baked into the rendition **on-device before upload** (S6 holds; explicit media processed locally). This is exact for **images / photo-sets**: the desktop renders one buyer-specific artifact and that is what is delivered. **Video does not pre-bake per buyer** — re-encoding and uploading N buyer-specific videos to Bunny.net Stream per gallery is infeasible. For video the achievable per-buyer trace is a **session/playback overlay** (honest deterrence, §6) plus the signed-URL access log; the invisible-forensic-mark-per-buyer claim applies to stills, not streamed video. This document must not promise pre-baked per-buyer video marks.

### What the hosted component stores

Only **opaque sale/unlock records:** `{sale_token, gallery_id (opaque), buyer_handle (opaque), unlock_status, access_log[], expires_at}`. **No PII beyond what the processor already holds** (the buyer transacts directly with the MoR), **no creator logins, no vault, no 2257 records, no master media, no media URLs.**

**`access_log[]` fields are defined and minimized**, because "signed-link access log" otherwise smuggles in PII that contradicts §9a's "no PII beyond what checkout requires." Each entry stores `{ts, event(release|fetch|deny), sale_token}` and a **truncated/coarsened** network signal only (e.g. `/24`-masked IP or a salted geo bucket), **not** a full IP or raw user-agent. The chargeback evidence kit's IP/device needs are met from the **processor's own representment data** (the MoR has the real card/IP/device fields), not from us — so we keep the minimization promise and still win disputes. Webhook receipts and access logs are pulled **back** to the desktop, the system of record; the component is a relay, not an archive.

**Threat model (§9a):** assume the component can be compromised, and a compromise must expose **no logins, no vault, no explicit content of record, no media-signing key, and no buyer-identifying data** — at worst opaque tokens and the fact that *some* opaque buyer unlocked *some* opaque gallery.

### Buyer-PII, retention & GDPR/CCPA posture

We **watermark an opaque per-buyer handle, not raw email and not a reversible hash** (§6). Under the local-first hypothesis the **creator is data controller of the buyer relationship** — but note this is the §7 GDPR row's `[HYPO-LEGAL]` *controller-status* hypothesis, **distinct from A12** (2257 secondary-producer / designated-agent scope). **Open processor question (counsel-pending):** if **we host** the component and it stores sale/access records, we are very plausibly a **data processor** (or joint controller for that processing) *even though* the creator controls the buyer relationship — which requires a **processor DPA** and an explicit **Art. 9 processing basis.** This document must not assert "we are not in scope" without resolving the processor question against Risk #2.

Buyer contact details for refunds/removal live in the desktop's encrypted-at-rest store, supporting **right-to-erasure tooling** (§4.15). Erasing a buyer purges the desktop record and issues a delete against the component rows **keyed by that buyer's `sale_token`s** (the desktop knows them; the opaque handle alone isn't globally linkable by design). **Erasure is deferred, not refused, while a dispute/chargeback window is open** — the webhook receipt + access log are the creator's own representment evidence, retained under GDPR Art. 17(3)(e) (legal-claims) until the window closes, then purged. Processor-held records follow the MoR's own retention (outside our control).

**Art. 9 minimization is operational, not just prose.** The sensitive datum is the *linkage* "this buyer purchased this adult gallery," and encryption-at-rest does **not** hide that linkage from the component operator — only minimization + short retention do. Therefore: `gallery_id` is opaque (never a human-readable title), `buyer_handle` is opaque, consent is captured at checkout by the MoR (evidence pulled to the desktop), and **default retention on the component is short:** unlock records expire on TTL + a bounded dispute-window grace, then auto-purge.

### Failure modes

- **Webhook lost / processor banned → unlock stalls.** Multi-processor + crypto failover (BTCPay/NOWPayments) is a MUST; the desktop re-mints intent against the next configured processor. **In-flight reconciliation:** a buyer who already *completed* payment on the now-banned processor must be unlocked from that processor's last verified webhook/receipt and **must not be re-charged** on failover; only un-started checkouts re-route. No buyer PII is stranded **on our component** (none was stored) — though the original MoR still holds its own records per its retention.
- **Component breach → attacker gets opaque tokens + opaque handles only;** cannot reverse to email (handles are random, salt is desktop-only), cannot reach media (no media-signing key, no pointers), cannot reach credentials or the vault.
- **Replay / forged unlock → blocked:** `sale_token` single-use; `nonce` + `issued_at` skew-bounded; `unlock_status` flips only on a **verified** processor webhook; signed-URL TTL bounds the access window.
- **Stolen desktop signing key → rotate the registered public key** (invalidates outstanding intents); this is why the key is per-creator and rotatable, not a global secret.

### Declaring to the inspector

These flows are **new egress paths the desktop must register with the "what leaves your machine" data-flow inspector** (§4.15, §14). For each Paid-Galleries action the inspector shows: destination (processor host, hosted component), and **the actual outbound payload** — the real JSON about to be sent, field-by-field — **diffed against the declared schema**, so the **"no explicit media, no raw email, no reversible hash, no credentials"** attestation is *verifiable from observed egress*, not a hardcoded promise the user must trust. For this audience a static attestation string is marketing; a live payload view diffed against schema is the trust artifact §14 actually demands — and is itself a purchase driver.

---

## In-app integration & rollout

This feature is an *overlay* on pieces Pink Battleship already has, not a new subsystem. The job is to thread "this set is paid" through the existing Galleries/DAM, SQLCipher vault, egress gateway, and OS-keychain settings — and to ship it in an order where a single processor ban can never be the thing that's untested. Two non-negotiable invariants govern every decision below: **(1) raw explicit media of record never leaves the machine** (§8/§9a, S6), so all per-buyer rendering is local; **(2) the desktop is never a server** — it has no public endpoint, so it *pulls* state from the thin host (§9a), it is never *pushed* to.

### Mapping onto existing pieces

- **Galleries/DAM (§4.2).** A sellable `Set` gains a `Listing`: `{ listing_id, set_id, price_minor, currency, processor_priority[], status('draft'|'live'|'paused'), preview_asset_id, watermark_policy('none'|'hashed_token'|'+forensic'), created_at }`. Pricing/processor priority live on the Listing, never on the master `Asset` — the immutable original is untouched. Provenance (§4.2 "sent-to-whom") gains a `sale_id` foreign key so an unlock is a first-class provenance event feeding the chargeback kit.
- **SQLCipher vault (§9).** Four new tables, all encrypted at rest:
  - `processor_account` (`{ processor_id, kind('ccbill'|'segpay'|'verotel'|'cardbilling'|'nowpayments'|'btcpay'|'mock'), mid, descriptor, reserve_pct, reserve_hold_months, settle_currency, priority, status('active'|'declining'|'banned'|'disabled') }`) — the home for descriptor/MID/reserve/priority; **keys live in keychain, only non-secret metadata here.**
  - `sale` (`{ sale_id, listing_id, processor_id, processor_txn_id UNIQUE, buyer_token_hash, amount_minor, fee_minor, reserve_minor, settle_currency, payout_id, reserve_release_at, status('pending'|'paid'|'failed'|'refunded'|'chargeback'|'expired'), signed_link_id, expires_at, paid_at }`). `processor_txn_id` is **UNIQUE** so a retried/replayed webhook is idempotent — never double-unlocks, never double-counts into §4.6. We store a **keyed HMAC** of a stable processor-supplied buyer identifier (per §6), salted with a per-creator secret from keychain — never raw card/email, and never a bare hash (a bare SHA of an email is rainbow-tabled). `reserve_minor`/`reserve_release_at`/`settle_currency`/`payout_id` feed the §4.7 cash-flow forecast and the §4.6 net engine; checkout revenue flows into the existing gross/net engine with no separate ledger.
  - `dispute` (`{ sale_id, opened_at, evidence_bundle_path, representment_status, network_dispute_id }`). VAMP flagging is **computed per `processor_id`** (each is a separate MID; VAMP is measured per acquirer/MID — a blended number would hide one MID breaching 1.5%).
  - `webhook_event` (`{ event_id UNIQUE, processor_id, sig_verified, received_at, payload_ref, applied_at }`) — the local landing zone for every verified event, so reconciliation and the audit trail are inspectable.
- **Egress gateway.** The desktop talks to **exactly two destination classes**, deny-by-default, each allowlisted only after its connector is enabled: **(a) the creator's own thin-host origin** (§9a) — for signed-URL mint requests and the **authenticated long-poll** that pulls verified sale/dispute events down (the desktop is the client, never a listener); and **(b) the processor's signing/mint endpoint** *only if* that processor requires the desktop to sign with its secret (see minting model below). Processor *webhooks* are **inbound to the thin host, not polled by the desktop** — the inspector labels them as such and never mislabels them as desktop egress. The inspector shows exactly which bytes egress (mint requests, event-pull) and confirms **no explicit media ever does.**
- **Settings / keychain (§4.15).** Processor API keys/secrets and webhook-signing secrets go in Electron safeStorage / OS keychain, **never the SQLCipher DB and never the thin host.** A "Payments" settings pane mirrors the connector risk-label pattern from §3.

### Minting, delivery & watermarking (the load-bearing details)

- **Who mints the checkout URL.** Default: the **desktop mints**, signing the hosted-checkout URL (FlexForms / FlexPay signed-URL) with the processor secret, which therefore never leaves the machine. Because a buyer can click while the creator's laptop is closed, the desktop **pre-mints a small rolling batch of time-boxed `live`-listing checkout URLs** and hands the opaque, self-contained signed strings to the thin host to serve statically. The thin host stores no secret and can mint nothing.
- **Signed gallery links are stateless HMAC, time-boxed.** `signed_link_id` is the HMAC key id; the link is self-validating so the **stateless** host needs no per-link state. Trade-off stated honestly: a leaked link works until `expires_at` with no server-side revocation — acceptable because the *content* behind it is already per-buyer watermarked and traceable. Re-issue for a legitimate buyer is a fresh mint keyed off `processor_txn_id`.
- **Per-buyer watermarking is local, post-payment.** A per-buyer visible-hashed-token (+optional forensic) mark must be rendered **after** the buyer exists, so it runs **on-device via the §8 FFmpeg/ImageMagick stack** when the verified `paid` event is pulled down. The signed link then points at the **creator-controlled store (Bunny.net, §4.10)** holding that buyer-specific rendition — **the thin host never touches the explicit media of record** (§9a/S6). Preview/low-res is the only asset the host may serve.

### Event flow & offline durability

Processor → **thin host receives webhook** → host **verifies HMAC signature + timestamp window**, dedupes by `event_id`, and **persists it to a small, scoped, encrypted pending-event queue** (a deliberate, documented exception to "stateless," holding *only* `{processor_id, event_id, signed payload, ts}` — no media, no logins, no vault) → the desktop's authenticated long-poll **pulls verified events**, re-verifies the signature locally against the keychain secret, writes the `sale`/`dispute` row idempotently, renders the watermark, unlocks. **Refund/chargeback events arrive days later when the desktop is likely offline** — the pending queue is precisely what lets them survive until the next launch; **reconcile-on-launch** drains it. Without this the chargeback kit would miss disputes whose representment SLAs are tight.

### New domain types & IPC surface

`Listing`, `Sale`, `Dispute`, `ProcessorAccount`, `SignedCheckout`. Main-process IPC (renderer never touches keys, secrets, or card data):

`payments.listSet(setId)`, `payments.upsertListing(listing)`, `payments.mintCheckoutUrl({listingId})` → `{ url, linkId, expiresAt }`, `payments.pullEvents()` (authenticated long-poll; verifies signatures, writes rows idempotently, renders watermark, unlocks), `payments.reconcile()` (drain pending queue on launch / on demand), `payments.buildEvidenceKit(saleId)` → bundle path, `payments.setProcessorStatus(processorId, status)` and `payments.failover(listingId)` (governs **new** checkouts only — selects the next `active` processor in `processor_priority`; **never mutates an in-flight sale**).

### New screens

A **"Sell this set"** sheet in the gallery (price, processor priority list, watermark policy, preview picker); a **Sales/Disputes** tab (live listings, unlock log, **per-processor VAMP gauge** against the 1.5% threshold over the network's trailing measurement window per §4.5/A15, one-click "assemble evidence kit"); and the Payments settings pane (per-processor key entry, descriptor/MID, reserve terms, health/risk label, failover order, and a **failover policy toggle: auto-rotate vs confirm-first** — because rotating the MoR changes the buyer-visible descriptor and itself carries chargeback risk).

### Failover, defined

`processor_account.status` is the rotation signal, set by explicit evidence, **not** a single decline: a decline webhook marks `declining` (advisory only); a sustained error class or a creator-confirmed account action marks `banned`. New `mintCheckoutUrl` calls skip non-`active` processors in priority order (the §6 MUST — a single ban must not zero income). A live sale already in flight is never re-routed.

---

## Open founder decisions

- **We-host vs creator-hosts the thin component (Risk #2).** Webhooks need a public endpoint and the pending-event queue is now a (scoped, stateful) cost; this changes both liability and the §6a economics, and it changes the GDPR controller/processor analysis (we-host very plausibly makes us a data processor / joint controller, requiring a DPA + Art. 9 basis). Recommend defaulting to we-host for friction, with a creator-host escape hatch. **Flag for §6a:** the durable pending-event queue + per-creator failover config are small but real recurring costs a pure one-time license must fund.
- **Which processor first (Risk #6 / A3/A4).** Recommend Segpay or CCBill for fastest solo onboarding-without-own-bank; treat CardBilling's claimed flat ~5% as unverified before betting first-processor on it (A4).
- **Stateless purity vs the offline-dispute queue.** The §9a "stateless where possible" rule is deliberately relaxed to a minimal, encrypted, media-free pending-event queue (plus the required replay-nonce cache and idempotency ledger) so late refund/chargeback webhooks survive desktop downtime. Confirm these scoped exceptions with the §9a threat-model owner.
- **Token model: opaque random handle vs keyed `buyerTokenHash`.** The opaque-handle form removes the dictionary-attack surface entirely and is recommended; the keyed-HMAC form is the minimum acceptable bound. Pick one and make the UI's anonymization claim match it.
- **Scope stays facilitate vs display-only (Risk #6)** and assist-only delivery — the app signs; the host only plumbs signed URLs and serves previews, never holds media of record.
- **Counsel sign-off gates the compliance claims** — GDPR data-controller vs data-processor status under each topology, the Art. 9 processing basis, and the 2257 secondary-producer scope (A12) — before any of this ships as a customer-facing claim (§7).

---

## Phased rollout

1. **Mock processor** — a local fake that mints/expires signed URLs and fires synthetic webhooks **covering the full lifecycle:** unlock, refund, chargeback, **late/offline delivery + reconcile-on-launch**, **duplicate/replayed webhook idempotency**, signature-verification failure (must reject), and an **end-to-end leak-trace** (watermarked file → `buyer_token_hash`/handle → `sale_id`). DAM↔vault↔unlock↔watermark↔P&L↔evidence-kit wiring is fully tested with zero real money or ban exposure.
2. **One real processor** (hosted checkout + signature-verified webhook via the thin host §9a) end-to-end with a live payout *and a verified reserve-hold/settlement reconciliation*, not just an unlock.
3. **Multi-processor failover** — priority list + status-driven rotation on confirmed decline/ban (the §6 MUST).
4. **Crypto failover** — NOWPayments (no chargebacks → simpler dispute path), then BTCPay for power users.

This rollout slots into the blueprint's **Phase 2 — Monetize, Operate & Produce** (§10): Paid Galleries & Checkout + chargeback evidence kit + crypto failover + watermarking + the thin hosted component (§9a) with its threat model.

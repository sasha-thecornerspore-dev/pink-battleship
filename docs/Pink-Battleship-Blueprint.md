# Pink Battleship
### Market-Research & Feature Blueprint
*An all-in-one, local-first desktop business cockpit for multi-platform adult content creators & cam models*

**Status:** Strategy v1 (research synthesis — pre-validation) · **Distribution:** Windows/macOS desktop (Electron), direct-signed installer · **Date:** 2026-06-13

---

> ### ⚠️ Scope & Method Disclaimer (read first)
> This document is **desk research synthesized from competitor pages and secondary/aggregator sources. It contains NO primary creator interviews and no signed willingness-to-pay evidence.** Many pricing, legal, tax, and platform-API figures are **indicative and dated (June 2026)** — they drift fast and several rest on single marketing/blog sources. Where this document uses confident language ("the iron law," "the truth is"), read it as a **research hypothesis to be validated, not an established fact.** Every figure flagged in the [Assumptions to Validate Before Build](#1a-assumptions-to-validate-before-build) table must be re-verified before it becomes a build constraint or a customer-facing claim. Legal/tax conclusions herein are **unconfirmed hypotheses pending counsel sign-off**, not advice.
>
> **Notation used throughout:** `[FACT]` = verified from primary/official source · `[EST]` = indicative estimate from secondary/aggregator source, confirm before relying · `[BET]` = editorial judgment / strategic opinion · `[HYPO-LEGAL]` = legal/tax hypothesis requiring counsel.

---

## 1. Executive Summary — The Opportunity & The Wedge

The tooling market for adult creators in 2026 is large and mature, but **structurally aimed at agencies, not solo operators**. Every serious incumbent — Infloww, Supercreator, OnlyMonster, CreatorHero — is an **OnlyFans-first, agency-priced, cloud-hosted chatter CRM**: built to run chat teams across many creators, charged per-creator on revenue tiers, holding the creator's logins and content in the vendor's cloud, and frequently riding **unofficial OnlyFans access infrastructure** that violates OnlyFans ToS and carries ban risk. `[EST]`

**The unserved person is the independent, multi-platform operator** — the model who cams on Chaturbate, runs subscriptions on OnlyFans/Fansly, sells clips on ManyVids/Clips4Sale, and advertises on Tryst, all by herself. Five concrete gaps define the wedge (each inferred from competitor feature matrices, **not yet creator-validated** — see Risk #0):

1. **Nobody unifies cam + subscription + clip + directory** into one cockpit with a true net P&L. The cheapest multi-platform tool, Aurifan (~$4.99/mo `[EST]`), is **read-only email-scrape analytics** — no operations.
2. **Agency pricing/UX is wrong for a solo** — shift schedulers and staff audit logs she doesn't need, priced for someone billing 20 accounts.
3. **Cloud SaaS holds her most sensitive data** — a breach/doxxing liability for the single most-targeted population online.
4. **Compliance is an afterthought** — no incumbent ships a 2257 vault, age-verification routing, leak-takedown workflow, or cross-platform tax view.
5. **Content production — her actual #1 growth ceiling and burnout driver — is unaddressed** by every tool, which all start *after* content exists.

### The Wedge

Pink Battleship is a **local-first desktop cockpit** on five first principles competitors violate:

1. **Multi-platform by design** — cam + subscription + clips + directory in one net P&L.
2. **Compliance-first integration** — official API where one exists; human-assist where automation is banned; every connector **risk-labeled** so the creator chooses with eyes open.
3. **Local-first / privacy by default** — credentials, fan data, content, and AI inference live on the creator's machine; we are not the data controller. Paired from day one with **opt-in zero-knowledge encrypted backup** (local-first must not mean data-loss-prone).
4. **Free, dependable AI baseline** that never refuses explicit work and never rate-limits, with a BYO-key upgrade path.
5. **Production-aware** — tooling for the shoot→teaser→multi-platform-deliverable pipeline, not just post-hoc asset management.

The ambition: the **TurboTax + Lightroom + CRM of the adult creator's whole business** — flat-priced for a solo operator, offline-capable, honest about how each connection affects account safety.

> **The single biggest unmade decision** is pricing/business model and its unit economics — see [§6a](#6a-pricing-business-model--unit-economics-proposed). The hardest *non*-build problem is **distribution to an audience mainstream ad networks ban** — see [§12 Go-to-Market](#12-go-to-market--distribution). Neither is an afterthought; both gate the whole thesis.

### Target user & rough market sizing `[EST]`/`[BET]`

A concrete bottoms-up sketch (to be replaced with real data):

- **Universe.** Public estimates put OnlyFans creators in the low millions globally; multi-platform *active* earners are a fraction. Assume **~1–3M creators worldwide earn meaningfully across ≥2 platforms**. `[EST]`
- **Desktop-reachable.** Adult creators skew **mobile-first** (see [§13](#13-mobile-reality--companion-experience)); assume **only ~30–50%** regularly work on a Windows/macOS machine they'd install software on. → ~0.3–1.5M.
- **Solo (non-agency) operators** who feel agency pricing as wrong-fit: assume **~50–70%** of that. → **~0.2–1.0M SAM.**
- **Geography.** The legal/tax/processor design below is **US-centric**; a US-first SAM is materially smaller (perhaps 30–40% of creators). International expansion is a *separate* scoping exercise — see [§7d](#7d-localization--non-us-scope).
- **Realistic SOM at launch:** low thousands of paying solo creators in year one is a credible target *if* distribution and trust are solved — these, not features, are the binding constraints.

**This sizing is illustrative arithmetic on unverified inputs.** Treat the SAM band as a hypothesis to falsify in validation, not a forecast.

---

## 1a. Assumptions to Validate Before Build

The riskiest claims in this document are consolidated here. **None should become a build constraint or a customer-facing claim until verified.** Owners are roles, not named individuals.

| # | Assumption (as used in this doc) | Confidence | Verification method | Owner |
|---|---|---|---|---|
| A1 | **Solo multi-platform creators perceive these gaps, want a desktop install, and will pay a flat fee** | `[BET]` — unvalidated | 15–25 problem interviews + a paid pre-order/LOI test before heavy build | Founder/PM |
| A2 | Platform revenue cuts (OF 20%, Fansly 20%, Chaturbate effective share) | `[EST]` — varies, not fixed | Confirm per-platform current terms; **make rates configurable + dated in-product, never hardcoded** | Product |
| A3 | Processor rates (CCBill, Segpay, Verotel, CardBilling, NOWPayments) | `[EST]` — aggregator blogs, quote-gated | Direct merchant quotes per processor; capture reserves/FX/floors | Founder/Finance |
| A4 | "CardBilling flat ~5% all-in" | `[EST]` — single source, suspiciously low | Treat as unconfirmed; verify reserve/FX/volume-floor exclusions directly | Founder/Finance |
| A5 | Per-check **age-verification** cost (Yoti/VerifyMy/Sumsub) | `[EST]` — opaque/quote-gated | Get per-check pricing + pay-as-you-go availability for a *solo* before treating AV as shippable | Product/Legal |
| A6 | **Bundled local LLM licenses** permit commercial use *for explicit generation* (Stheno/Lumimaid/Lunaris/Nemo/Cydonia/Euryale) | `[EST]` — **unverified, likely partly non-compliant** | License + base-model AUP review (esp. Meta Llama AUP sexual-content clauses, Mistral terms) **before bundling anything** | Legal/Eng |
| A7 | OnlyFans/Fansly broker "0 bans across thousands of accounts" | `[BET]` — vendor marketing | Independent evidence; quantify ban rate or treat as unquantifiable | Founder |
| A8 | "Session-bridge reading own session = lower ban surface / more ToS-aligned" | `[BET]` — **legally optimistic** | Counsel review; **OF ToS bans automation of any kind** — see Risk #1 | Legal |
| A9 | Fanvue API specifics (100 req/60s, version `2025-06-26`, 48h sub-expiry webhook, agency endpoints, KYC gating) | `[FACT]` API exists; `[EST]` exact numbers | Re-confirm against live docs at build time | Eng |
| A10 | "Reddit stopped issuing new free API keys Dec 2025; use existing creds only" | `[EST]` — secondary sources, policy churns | Re-verify against Reddit's current API terms before designing around it | Eng |
| A11 | TAKE IT DOWN Act (~$53,088/violation, 48-hr SLA, FTC enforcement May 2026) | `[FACT]` on figures; `[HYPO-LEGAL]` that local-first = out of scope | Counsel: confirm covered-platform boundary & designated-agent duty | Legal |
| A12 | 2257 secondary-producer scope; "no DMCA designated-agent duty if we don't host" | `[HYPO-LEGAL]` | Counsel sign-off before shipping the vault as a compliance claim | Legal |
| A13 | Stripe/PayPal/Square/Cash App/Venmo "all prohibit adult, freeze 180 days" | `[EST]` — broadly true, stated absolutely | Confirm current policies; 180 days is worst-case, regional nuance exists | Finance |
| A14 | Benchmark targets (churn 20–30%, rebill 80%+, PPV unlock 22–35%, ARPU $15–50, Reddit ARPU ~$88) | `[EST]` — marketing roundups, niche-variable | **Ship as labeled "rough industry-cited ranges," never as personalized targets** | Product |
| A15 | VAMP threshold | `[FACT]` — **1.5% in effect since Apr 1 2026** (NA/EU/APAC), ~$8/dispute above threshold | Monitor for further network revisions | Finance |

---

## 2. Competitive Landscape

| Tool | Focus | Price | Key gap we exploit |
|---|---|---|---|
| **Infloww** | OF/Fansly/MYM/Fanvue agency CRM | $40–$50/creator/mo → $500+ `[EST]` | Agency-priced, cloud, rides unofficial OF access; 2025 downtime/price-hike/support complaints. *Note: its promo "free until 30 June 2026" lapses imminently — verify.* |
| **Supercreator** | OF CRM + AI chat | $159–$279/mo + 5% of AI sales `[EST]` | OF-centric; AI chat in ToS grey zone; pricey for solo |
| **OnlyMonster** | Budget OF/Fansly desktop-browser CRM | Revenue-tiered `[EST]` | OF-focused, light financials |
| **CreatorHero** | OF agency ops — **desktop app** | $40–$260/account (~$95 floor) `[EST]` | OF-only, staff-centric; **proves desktop distribution works in this niche** |
| **AI chatters** (ChatPersona, FlirtFlow, Botly) | AI DM drafting/sending | $15/mo → $1,000 onboarding `[EST]` | OF bans AI-written DMs; survive only via human "send" |
| **Scrile Connect** | White-label "build your own OF" | Subscription + add-ons | You *become* the platform (payments/KYC/2257 all yours) — different category |
| **Aurifan** | Read-only multi-platform analytics (email-scrape) | ~$4.99/mo `[EST]` | Analytics only — no ops/messaging/posting. **Already owns the cheap-multi-platform-analytics niche — a fast-follow threat** |
| **FanCentro** | Adult monetization platform + tools | Revenue share | A destination platform, not a neutral overlay |
| **Fanvue** | OF-alternative with **official OAuth API** | Revenue share | Smaller fanbase — but the only sanctioned, AI-permissive API |
| **Link-in-bio (adult-safe)** | AllMyLinks, Direct.me, Beacons, Lnk.bio | Free–$59/mo | Feature-thin; no SFW hub + age-gate + revenue-attributed analytics |
| **Link-in-bio (adult-hostile)** | Linktree, Stan Store, Carrd | Free–$ | Ban adult content in ToS — cautionary, not usable |

**White-space we'd own** (the wedge, stated once — see [§1](#1-executive-summary--the-opportunity--the-wedge) for why): the whole-business cockpit; true net P&L; cross-platform fan identity/LTV; compliance-by-design; production tooling; and trust-as-a-feature.

### 2a. Moat durability — the honest version `[BET]`

The thesis "incumbents are OF-first, agency-priced, cloud" is a **positioning gap, not a structural moat.** Sober assessment:

- **What a funded incumbent can copy in ~1–2 quarters:** a flat solo tier, a desktop app (CreatorHero already has one), "risk labels," and local NSFW tagging (the open models are public). Assume Infloww/Supercreator *will* copy any validated wedge.
- **What is genuinely harder to copy quickly:** (a) a *credible* local-first/zero-knowledge trust posture from an incumbent whose entire business is cloud data custody (architectural and reputational reversal); (b) accumulated **cross-platform net-P&L + fan-identity data** that compounds per creator and creates switching cost; (c) a trust brand with this paranoid audience, earned via audits/open-sourcing (see [§14](#14-trust--security-package)) — slow for anyone to build.
- **What is NOT a durable moat:** local NSFW auto-tagging (cloud DAMs *can* offer NSFW tagging to verified adult businesses; an incumbent can bundle the same open models — it's a **real near-term advantage, not unmatched**) and "Pink Battleship MCP" (an assembly of open components).
- **Realistic strategy:** win on **speed + trust + switching-cost data lock-in + production tooling depth**, and treat the feature gaps as a 12–18-month head start to compound, not a wall.

---

## 3. Platform Integration Matrix

Three driver types: **Official API**, **Unofficial-risky** (broker/reverse-engineered/session-bridge), **Manual-assist** (CSV import / email-parse / clipboard+open-composer / OCR).

| Platform | Official API? | Pull / push | Approach | Notes |
|---|---|---|---|---|
| **Chaturbate** | `[FACT]` Yes — Events + Stats API | Tips, token purchases, PMs, fanclub joins, viewers, follows, private/offline tips; affiliate income | **Official** (token, encrypted locally) | Anchor integration. Long-poll JSON, ~2000 req/min `[EST]`. Inbound only (no scheduling). |
| **Fanvue** | `[FACT]` Yes — OAuth 2.0 + PKCE, versioned | Posts (create/schedule/pin), mass/automated messages, media/vault, subscribers, earnings/insights, tracking links, agency endpoints, webhooks (e.g. sub-expiry) | **Official** (`auth.fanvue.com`→`api.fanvue.com`) | Only sanctioned, AI-permissive subscription API. Exact rate limit/version/KYC-gating `[EST]` — re-confirm (A9). `[BET]` Build first-class. |
| **OnlyFans** | `[FACT]` No (closed partner program) | Messages, fans, earnings, chats, posting — only via creator's own session | **Manual-assist (default)**; broker path **deferred/under review** (see Risk #1) | Never self-scrape. OF ToS bans automation **of any kind** → assist-only is the defensible default. |
| **Fansly** | `[FACT]` No official | Earnings, transactions, per-fan stats, subscriber lists, chats | **Manual-assist (default)**; broker deferred | Same ban-risk profile as OF. |
| **ManyVids** | `[FACT]` No | Clip/sub/custom sales, payout data | **Manual-assist** — CSV import + email parse | Read-only analytics is the realistic win. |
| **ModelCentro** | `[FACT]` No (white-label host) | Hosted-site fan/payout data | **Manual-assist** — CSV/manual | Creator owns the site; could negotiate DB access. |
| **Tryst.link** | `[FACT]` No (ad directory) | Profile, rates, availability — no earnings | **Manual-assist** — local profile mirror + reminders | Booking/profile only. |
| **Clips4Sale / IWantClips** | `[FACT]` No | In-account sales dashboard | **Manual-assist** — CSV / OCR | Earnings not exposed. |
| **MyFreeCams** | `[FACT]` No (MFCAuto websocket) | Live tips/joins/chat | **Unofficial-risky (optional)** | Mature OSS lib; protocol-fragile. Risk-gated. |
| **Stripchat / BongaCams** | Affiliate XML only | Affiliate/traffic feeds (not creator earnings) | **Manual-assist** | Model stats manual/community-scraped. |
| **LoyalFans / JustForFans** | `[FACT]` No public | Sub/PPV data | **Manual-assist** — CSV/manual | Adult-friendly; good API-lobby candidates. Re-check. |
| **AVN Stars** | Defunct (payouts ended Jan 2022) | — | **Exclude** | Completeness only. |

**Architectural rule:** one connector abstraction, three drivers; all secrets in an OS-keychain-backed encrypted vault; per-connector risk label in UI; **never proxy OnlyFans/Fansly traffic through our servers**; explicit consent + risk acknowledgement before any Unofficial connector.

### 3a. Detection arms-race & graceful degradation `[BET]`

Any non-official read of OF/Fansly — **including reading one's own session** — sits in an **active anti-automation arms race** (platforms evolve bot/behavioral detection; the broader ecosystem already trades in nodriver/anti-detect tooling). Design accordingly:

- **Assume the session-bridge will break** on platform changes; it is a convenience layer, never the system of record.
- **Manual-assist (CSV/email-parse/manual entry) is the durable floor** that keeps working when automated reads fail — it must be first-class, not a fallback stub.
- Ship a **connector health monitor** that detects breakage, fails safe (stops sending, alerts the creator), and degrades to manual-assist rather than retrying aggressively (which raises ban risk).
- Be explicit with the creator that automated reads are **best-effort and may degrade**; never present them as guaranteed or "safe."

---

## 4. Feature Blueprint by Module

Priority tags: **[Must]** ship to be lovable · **[Should]** strong differentiator, fast-follow · **[Could]** later/upsell · **[Wont]** explicitly out of scope.

### 4.1 Platform Hub (connector layer)
- **[Must]** Connector framework, three driver types.
- **[Must]** Native Chaturbate (Events+Stats) and Fanvue (OAuth/PKCE).
- **[Must]** Per-connector **trust/risk label** shown before and after connect.
- **[Must]** Manual-assist pipeline: CSV import + email parse + manual entry; screen-region OCR fallback — **treated as the durable floor (see [§3a](#3a-detection-arms-race--graceful-degradation)), not a stopgap.**
- **[Must]** **Connector health monitor** — detects breakage, fails safe to manual-assist, alerts creator.
- **[Could / under review]** Opt-in OnlyFans/Fansly broker connectors **and** own-session-bridge reader — **gated behind Risk #1 decision**; ship only if the broker stance resolves to "offer with consent." Until then, **not built.**

### 4.2 Master Gallery & DAM
- **[Must]** Asset/Variant/Set model in **SQLite + FTS5** (immutable original → renditions → ordered sellable sets).
- **[Must]** Master gallery + nested folders + **smart saved-search sub-galleries** ("Posted to Fansly but not OnlyFans", "NSFW unsent").
- **[Must]** **Local NSFW-capable auto-tagging** (JoyTag — Apache-2.0 `[FACT]` — + wd-vit-tagger-v3), fully offline. *Near-term advantage, not a permanent moat (see [§2a](#2a-moat-durability--the-honest-version)).*
- **[Must]** NSFW/SFW gate + **safe-mode workspace** (blurred thumbnails default; SFW-only view for screen-share).
- **[Must]** Faceted search (tags + person + platform + date + color + search-by-image).
- **[Must]** **Default-on EXIF/GPS stripping on export** + pre-export warning + audit log (anti-doxxing).
- **[Must]** Perceptual dedupe + variant grouping (content hash + watermark-robust videohash).
- **[Should]** Cross-platform **provenance** (posted-where + sent-to-whom; never re-send the same PPV) — **feeds the chargeback evidence kit ([§4.3](#43-paid-galleries--checkout)).**
- **[Should]** Video poster frames + hover-scrub WebVTT sprites + keyframes (bundled ffmpeg).
- **[Should]** Sets/Albums as first-class sellable products.
- **[Should]** Multi-source ingest: watch folders, SD/USB, cloud, OF Vault (best-effort).
- **[Could]** Local opt-in face/person grouping (gated by release status).

### 4.3 Content Production & Repurposing *(NEW — the actual #1 pain)*
The research flags **production as the true growth ceiling and burnout driver.** Incumbents start *after* content exists; this module is a genuine differentiator. `[BET]`
- **[Must]** **Shoot-planning calendar** — plan shoots, link to target deliverables/platforms, track shot lists, tie outputs back to assets.
- **[Must]** **"One shoot → N deliverables" assembly line** — take an explicit master and generate the platform-tailored set (sub post, PPV, teaser, SFW promo) with per-platform specs and posting-status tracking.
- **[Should]** **Auto-generate SFW/teaser variants** from explicit masters (auto-crop/blur/cover-up to platform-safe versions for IG/TikTok/Reddit/X promo) using the local media stack — *no explicit frame leaves the machine.*
- **[Should]** **Auto-clip highlights from cam VOD recordings** (scene/tip-spike detection → sellable clips for ManyVids/Clips4Sale), bundled ffmpeg.
- **[Could]** Template/preset library for recurring deliverable formats; batch watermarking handoff to [§4.5](#45-paid-galleries--checkout).
- **[Wont]** Full NLE/video-editing suite — integrate/handoff, don't rebuild Premiere.

### 4.4 AI Assistant (architecture in [§5](#5-the-ai-assistant-architecture))
- **[Must]** OpenAI-compatible **provider router with content-policy tags** (explicit-ok vs SFW-only; private vs trains-on-data).
- **[Must]** Bundled **local-first free baseline** — **subject to license clearance (A6); if a model cannot be cleared for commercial explicit use, ship a user-initiated download/BYO-model flow instead of bundling it.**
- **[Must]** Encrypted **BYO-key vault**.
- **[Must]** **Data-sensitivity guard** before any hosted call (redact/block/force-local on PII or explicit).
- **[Must]** **Creator-defined hard-boundary list** — acts/words/scenarios she won't roleplay, enforced across **all** backends incl. local, so the assistant never drafts off-brand/boundary-violating content in her name.
- **[Should]** Central persona profile (Tavern v2-compatible).
- **[Should]** Fan DM auto-reply + upsell **drafting (human-in-the-loop, draft-not-send)**.
- **[Should]** Local fan-CRM memory + on-device thread summarization.
- **[Should]** Captions/posts/content-idea generator (SFW hosted by default).
- **[Could]** Smart failover chain; inbound safety pre-screen; per-provider cost meter.

### 4.5 Paid Galleries & Checkout
- **[Must]** Hosted-checkout gallery links via the creator's adult processor (CCBill FlexForms, Verotel/CardBilling FlexPay, Segpay); app mints a **signed URL**, unlocks on server-side webhook. No card data touches the app.
- **[Must]** **Multi-processor + crypto failover** so one ban doesn't kill income.
- **[Must]** **Per-buyer dynamic watermarking** on delivery (visible *hashed* buyer token + optional invisible forensic mark) — honest leak **traceability**, not fake DRM.
- **[Must]** Time-expiring signed links + low-res preview / watermarked full-res on confirmed payment.
- **[Must]** **Chargeback / dispute-defense toolkit** — auto-assemble a **compelling-evidence representment kit** (watermarked-delivery proof, signed-link access logs, 2257 link, provenance trail) for the processor. Turns provenance data into concrete chargeback-win value and **directly protects the VAMP ratio.** `[BET]`
- **[Should]** Auto-generated **compliant checkout landing page** (2257 statement, 18+ gate, refund policy, removal contact).
- **[Should]** VAMP-ratio guardrails — **threshold is 1.5% (in effect since Apr 1 2026, NA/EU/APAC), ~$8/dispute above threshold `[FACT]` (A15).**
- **[Could]** Honest screenshot-deterrence (session overlay watermark) + leak reverse-search hook.

### 4.6 Analytics & Suggestions
- **[Must]** **Unified cross-platform P&L — gross AND net.** Platform cuts, processor fees, refunds, and chatter pay are **configurable, dated inputs — never hardcoded** (A2). Defaults shown as editable estimates.
- **[Must]** Canonical KPI panel with **trend deltas** and, where shown, **clearly-labeled "rough industry-cited ranges" (NOT personalized targets)** — churn ~20–30%, rebill ~80%+, PPV unlock ~22–35%, ARPU ~$15–50, Reddit ARPU ~$88 — all `[EST]`, niche-variable (A14). The engine must **not** emit "you're underperforming" signals against these.
- **[Must]** Cross-platform fan/whale CRM with spender tiers + cross-platform identity stitching.
- **[Must]** **Explainable suggestion engine** — ranked daily action queue by $-impact; each card shows metric + reasoning + expected lift + one-click action.
- **[Should]** Churn-risk scoring + automated win-back triggers (14+ days idle).
- **[Should]** Per-creator best-time intelligence from the creator's *own* data.
- **[Should]** Content/PPV leaderboard with net-revenue ROI; traffic-source LTV attribution.
- **[Could]** Anonymized opt-in cohort benchmarking; multi-currency reconciliation export.

### 4.7 Financial Health & Income Smoothing *(NEW)*
Adult income is volatile and processor reserves tie up cash; this pairs naturally with the tax dashboard and is genuinely differentiated. `[BET]`
- **[Should]** **Cash-flow forecast** accounting for **held processor reserves** (e.g. a reserve % held for N months — *figures configurable, see A3*), payout cycles, and chargeback holds.
- **[Should]** **SE-tax / income-tax set-aside recommendation** ("set aside ~X% of this payout") — **informational, not advice; jurisdiction-aware flag (US default, others TBD — [§7d](#7d-localization--non-us-scope)).**
- **[Could]** "Lean-month" smoothing suggestions; reserve-release calendar.

### 4.8 Scheduler / Calendar / Notifications
- **[Must]** **Unified timezone-aware content calendar** (subscription posts + social promo + mass-DM + cam go-live).
- **[Must]** Tiered scheduling backends (Official API > sanctioned > manual-assist).
- **[Must]** **Manual-assist queue** for no-API platforms (reminder → copy caption/price → open native composer → track done).
- **[Must]** Local desktop **notification engine** (toast + persisted jobs in SQLite, tray app): go-live countdown, PPV launch, Reddit cooldown-elapsed, cap warnings, re-engagement nudges.
- **[Must]** **Per-platform rate/spacing guardrails** (figures `[EST]`, configurable: OF send caps, TikTok/IG/Reddit cooldowns).
- **[Should]** Mass-DM/campaign scheduler with fan segmentation (native via Fanvue; assist for OF/Fansly).
- **[Should]** Best-time suggestions; NSFW-label pre-flight on cross-posts; humanization jitter on automated sends.
- **[Could]** Push/email channels; recurring/templated schedules.
- **[Wont]** iCal/Google Calendar export of explicit-labeled events (exposes content plan / trips provider policy).

### 4.9 Account-Safety & Per-Platform Health Monitor *(NEW — operationalizes the trust promise)*
- **[Must]** **Per-platform ban-risk dashboard** — track sending cadence, mass-DM similarity, off-platform-link usage, automated-read health, and warn **before** a ToS tripwire is crossed.
- **[Should]** Pre-send lint (flags near-identical mass DMs, payment-redirect language, banned terms).
- **[Should]** Surfaces connector-health/arms-race status from [§3a](#3a-detection-arms-race--graceful-degradation).

### 4.10 Website Builder
- **[Must]** One-click **SFW-shell** site (link hub + landing) to adult-friendly host (Cloudflare Pages or offshore), auto SSL + custom domain.
- **[Must]** **Build-vs-embed** architecture: explicit media stays on Bunny.net Stream / platforms; checkout embedded from CCBill/Segpay — the creator's domain never stores cards or raw explicit media of record.
- **[Must‑gated]** **Per-jurisdiction age-gate module.** Simple 18+ interstitial where allowed. **Brokered "highly effective" AV (Yoti/VerifyMy/Sumsub) is gated on a solved per-check cost + pay-as-you-go path for a solo (A5)** — until that unit economic is known, AV is an **open question, not a committed Must**, because per-check cost could make direct sales uneconomic. Law specifics (US state list, UK OSA, EU DSA) **change fast — re-verify at build (A11/A5).**
- **[Must]** Adult-aware templates + link-in-bio hub on the creator's **own** domain (18+ splash so IG/TikTok/Reddit links survive).
- **[Should]** Compliance advisor/jurisdiction explainer; adult-permissible SEO toolkit; embeddable gallery/checkout widget manager.
- **[Could]** Multi-host failover/portability.
- **[Wont]** Native EUDI Wallet integration (still piloting/litigated — build the abstraction, defer).

### 4.11 Cloud Storage & Encrypted Backup
- **[Must]** **One S3-compatible connector** (AWS SDK v3, configurable endpoint): Backblaze B2, Wasabi, AWS S3, Cloudflare R2 — multipart + presigned URLs.
- **[Must]** **Backblaze B2 default** (~$6/TB/mo, free egress to 3× storage `[EST]`, NSFW-permissive AUP — verify current terms).
- **[Must]** **Client-side zero-knowledge AES-256 encryption** (rclone-crypt-compatible) — provider holds only ciphertext.
- **[Must — moved up from Phase 3]** **Opt-in zero-knowledge cross-device backup & restore from day one.** A local-first app holding a creator's entire financial/legal/fan system of record **cannot** treat backup as an upsell; **device loss = total business-data loss** otherwise. Includes a **tested restore flow** and a **printed/exportable recovery key** (with explicit "lose this = data unrecoverable" warning).
- **[Must]** **Per-provider adult-policy/risk advisor** in connect flow (B2/Wasabi/S3 safe; Dropbox/OneDrive private-OK-sharing-risky+scanning; Google Drive/pCloud ban adult — re-verify).
- **[Must]** Secrets in OS keychain.
- **[Should]** Multi-device read/access path (see [§13](#13-mobile-reality--companion-experience)); cost/retention calculator.
- **[Could]** Lifecycle/cold-archive tiering.
- **[Wont]** MEGA / pCloud-Crypto (ToS porn clauses); Sync.com / Icedrive (no usable API).

### 4.12 Multi-User / VA Mode *(architectural seam from day one)*
The report positions against agencies, but **many solo creators hire a VA/chatter as they grow** — and local-first architecture is fundamentally hostile to multi-user access. If "team mode" is a Phase-3 bolt-on, **the creator must leave the product the moment she hires help.** That tension is confronted here. `[BET]`
- **[Must — architectural, even if UI ships later]** Design the data model and credential vault with a **scoped, permissioned, audited access seam** from the start (roles, per-fan/per-platform scoping, action audit log), so single-user today can become creator+VA tomorrow without re-architecting.
- **[Should]** Opt-in **encrypted shared layer** (e.g. a permissioned sync of a scoped subset) so a VA on a second machine can chat/schedule without holding raw platform logins or the full vault.
- **[Could]** Shift/coverage view; per-VA performance attribution.

### 4.13 Leak Monitoring & Takedown Orchestration
Leaks are a top *emotional* pain; package the existing pieces into one proactive workflow rather than rebuilding scanning. `[BET]`
- **[Should]** Scheduled reverse-image/hash search against the provenance/fingerprint registry.
- **[Should]** Auto-drafted **DMCA / TAKE IT DOWN notices** + status tracking, drawing buyer-watermark + provenance evidence.
- **[Should]** Optional handoff to BranditScan/Rulta (don't rebuild their crawler).

### 4.14 Help / Onboarding & Migration
- **[Must]** First-run **welcome wizard with platform profiling** (branches setup by platforms selected).
- **[Must]** **Data import / migration as a first-class onboarding step (NEW):** import from **Infloww/CreatorHero export**, **OnlyFans data-export** ingestion, and **ManyVids/Clips4Sale CSV** history. **Switching cost *into* the product is as important as features**; a creator with two years of history must be able to bring it.
- **[Must]** Always-available **setup checklist tied to real in-app events** (auto-completes).
- **[Must]** Per-section guided tours + full walkthrough, re-runnable from a Help hub.
- **[Must]** **MIT-only tour stack** (react-joyride + Driver.js) — *avoid Shepherd.js & Intro.js (AGPL/commercial), a verified licensing trap.* `[FACT]`
- **[Should]** Local-first AI "explain this screen" RAG over bundled docs; offline searchable help; sample/demo data mode.

### 4.15 Settings / Security & Emergency Controls
- **[Must]** **OS-keychain secret storage** for every credential/key/token; detect Linux `basic_text` plaintext fallback and warn.
- **[Must]** **Encryption at rest** for the whole datastore + app-level unlock (2FA/biometric/passkey).
- **[Must]** **Encrypted 2257 Records Vault** (see [§7](#7-compliance--safety--concrete-design-requirements)).
- **[Must — NEW]** **Kill switch / emergency lockdown** — instant local re-encryption/lock + an optional **remote-wipe-on-next-launch token**, for the realistic threat model of a **stolen/seized device or an abusive ex.** Distinct from routine lock; designed for this audience's actual danger.
- **[Should]** Audit log + one-click **key rotation** + the encrypted backup/restore from [§4.11](#411-cloud-storage--encrypted-backup) ("panic kit").
- **[Should]** Data-export / right-to-erasure tooling for fan PII (CCPA/GDPR).
- **[Should]** **In-app "what leaves your machine" data-flow inspector** (see [§14](#14-trust--security-package)).

---

## 5. The AI Assistant Architecture

Driven by a **2026 content-policy reality**: the two frontier SFW APIs refuse the core sexting/explicit use case. **Anthropic Claude categorically prohibits sexually explicit content** `[FACT]`; **OpenAI's age-gated "adult mode" (announced Oct 2025) was paused indefinitely in early 2026 and remains paused as of June 2026** `[FACT]`. So **the explicit path cannot depend on the big SFW providers.**

### Two-layer model

**1. Free local baseline (reliability backbone).** Bundle **Ollama** (headless), auto-detect VRAM, ship a model picker. **⚠️ Licensing caveat (A6):** the candidate models below are *capability* suggestions only; **several are Llama/Mistral derivatives whose base-model acceptable-use terms may prohibit sexual content or commercial bundling.** Until each is license-cleared by counsel, **do not bundle it** — instead offer a **user-initiated download / BYO-model** flow so the user, not Pink Battleship, obtains the weights.

| VRAM | Candidate model `[EST capability, license UNVERIFIED]` |
|---|---|
| 8 GB | Stheno / Lumimaid / Lunaris 8B |
| 12–16 GB | Mistral Nemo 12B |
| 24 GB | Cydonia 24B |
| 48 GB+ | Euryale 70B |

This layer is the **dependability promise** — cloud tiers change quotas/policy without notice (e.g. reported free-quota cuts in late 2025 `[EST]`); the local/BYO model is the floor.

**2. BYO-key upgrade.** User pastes their own keys into the encrypted vault: Claude/GPT for premium SFW; Venice/Featherless for higher-quality explicit work than local hardware allows.

### NSFW routing reality

One OpenAI-compatible adapter speaks to Ollama, LM Studio, Groq, Cerebras, OpenRouter, OpenAI, Venice, Featherless (only Anthropic needs its SDK/shim). Every model is tagged **explicit-ok / SFW-only** and **private / trains-on-data**; the router auto-selects by task:

| Task | Route to | Why |
|---|---|---|
| Explicit fan DM / sexting draft | **Local/BYO uncensored** (Ollama) or **Venice/Featherless** | Claude/OpenAI refuse; Gemini filters + may train |
| SFW captions / ideas / scheduling copy | **Groq** (no-train) or **Cerebras** free tier `[EST]` | Fast, low-sensitivity |
| Premium SFW summarization / strategy | **Claude / GPT (BYO)** | Best quality, never explicit |
| Anything with fan PII | **Local / no-log provider only** | Never to training-tier providers |
| "Explicit but no local GPU" | **OpenRouter** uncensored model (BYO) | Hosted explicit |

### 5a. Safety Policy Spec (testable acceptance criteria) — highest-liability behaviors

These are **not prose guidance**; they are **mandatory, testable rules** with acceptance criteria. All must have automated tests; failures are release-blocking.

| ID | Rule | Applies to | Acceptance criterion |
|---|---|---|---|
| S1 | **CSAM / minors / non-consensual content is hard-blocked** | **ALL backends, including local/BYO** (which have *no external moderation*) | Given a prompt in these categories, the app refuses and never dispatches to any model; logged locally; covered by test suite |
| S2 | **Explicit content is hard-blocked from Claude / OpenAI / filtered-Gemini** | Hosted SFW providers | Explicit-tagged task can never be routed to an SFW provider, protecting the user's API account from termination |
| S3 | **PII never sent to training-tier providers** | All hosted calls | Data-sensitivity guard detects PII and blocks/redacts/forces-local before any request leaves the machine |
| S4 | **Creator hard-boundary list enforced** | ALL backends incl. local | User-defined forbidden acts/words/scenarios are filtered from generation regardless of model |
| S5 | **Draft-and-approve default (no auto-send)** | Fan messaging | Generated DMs require explicit human send unless the user opts into automation per platform's ToS posture |
| S6 | **Explicit media never leaves the machine for AI processing** | Local media/tagging stack | Tagging/teaser-gen for explicit assets runs on-device only |

Because **local uncensored models have no external moderation layer, the app itself is the moderator** for S1/S4 — this is the single highest-liability surface in the product and warrants the strongest test coverage and a counsel review of the blocklist taxonomy.

---

## 6. Payments & Monetization Reality

**The firewall rule `[EST]`, stated once with nuance:** Visa/Mastercard *network* rules (more than the processors themselves) push adult into a high-risk lane. **Stripe, PayPal, Square, Cash App, and Venmo broadly prohibit adult content and can freeze funds (up to ~180 days, worst-case).** There is regional and SKU-level nuance (some non-explicit adult-*adjacent* SKUs are tolerated), but the safe design is to **firewall them out of any adult revenue path** and use them only for clearly-SFW SKUs (merch, coaching). Confirm current policies before relying (A13).

**The real rails are adult-specialist IPSPs**, hosted-checkout / merchant-of-record so the app never touches card data (no PCI-DSS burden). **All rates below are `[EST]` from comparison aggregators — indicative only, confirm directly at onboarding (A3/A4):**

| Processor | Model | Indicative cost `[EST — confirm at onboarding]` | Fit `[BET]` |
|---|---|---|---|
| **CCBill** | MoR, FlexForms hosted, custom one-off PPV, webhooks | ~3.9%–14.5% + ~$0.55 | Ubiquitous; solo can onboard without own bank |
| **Segpay** | MoR, hosted, fast KYC | ~4%–15% | Fastest onboarding |
| **Verotel / CardBilling** | EMI, **FlexPay signed-URL** | Verotel ~15.5% + reserve; **CardBilling claimed flat ~5% — treat with suspicion (A4)** | CardBilling *may* be most indie-friendly **if the flat rate survives verification** |
| **NOWPayments** (crypto) | Non-custodial, 300+ coins | ~0.5% | Censorship-resistant failover, no chargebacks |
| **BTCPay** (self-hosted) | 0% | Free | Power-user later |

### Gallery checkout approach
The app **mints a signed checkout URL** through the creator's processor and **unlocks on a server-side webhook/postback** — which **requires a small hosted component** (see [§9a](#9a-the-thin-hosted-component-first-class-architecture--threat-model)). **Multi-processor + crypto failover is a Must:** a single processor ban is the industry's biggest single point of income failure.

**On leaks, be honest:** absolute DRM/screenshot-blocking is a myth on desktop. The achievable win is **per-buyer dynamic watermarking (visible hashed token + optional invisible/forensic) + time-expiring signed links** → leaks become **traceable and deterred**, and the watermark/provenance trail powers the **chargeback evidence kit ([§4.5](#45-paid-galleries--checkout)).** Watermark a *hashed* buyer ID, not raw email.

---

## 6a. Pricing, Business Model & Unit Economics *(proposed — the core commercial decision)*

The prior draft punted this to "Founder's Call." That is the **single most important product decision** and is made concrete here as a **hypothesis to test** (A1), not a final answer.

### Pricing hypothesis `[BET]`
- **Primary recommendation: flat subscription, per-creator-flat (not revenue-tiered), ~$29–$49/mo `[BET]`**, single price independent of her earnings — the explicit anti-agency wedge. A lower **~$15/mo "starter"** (analytics + DAM + local AI, no checkout/website) can serve as an on-ramp.
- **Alternative to test: one-time perpetual license (~$149–$299) + optional paid cloud add-ons** (the Eagle/CreatorHero pattern), which suits a privacy-minded, own-your-tools audience and removes recurring-billing churn. The risk is funding ongoing server costs (webhooks, AV brokering).
- **Avoid** percentage-of-revenue pricing entirely — it reproduces the agency model we're attacking and is hostile to the trust positioning.

### Unit economics — the parts with real marginal cost `[EST]`
Flat pricing only works if marginal cost per creator is low and **bounded**:

| Cost driver | Nature | Implication for pricing |
|---|---|---|
| **Thin hosted webhook/landing component** | Per-creator hosting + bandwidth for checkout callbacks & SFW site | Small but **non-zero and recurring** — a pure one-time license must fund this somehow (add-on or reserve) |
| **AV per-check brokering (A5)** | **Pay-per-verification, opaque, potentially significant** | If we front AV cost, a high-traffic free site could be **loss-making** — strongly favors **pass-through billing** or creator-pays-direct, not bundled |
| **Support** | High-touch for a low-trust, non-technical audience | Budget meaningfully; consider community + docs to deflect |
| **Crypto/processor** | Borne by creator's own merchant account | ~zero to us (we don't take custody) |
| **AI inference** | Local/BYO by design | ~zero to us — a deliberate cost-structure advantage |

**Key conclusion:** the architecture deliberately pushes the expensive marginal costs (AI, payments custody, storage) onto the creator's own resources/accounts, which is what *makes* flat solo pricing viable. The **two cost risks that could break flat pricing are the thin server and AV brokering** — both must be either pass-through or tightly bounded. **This entire section is a hypothesis pending the willingness-to-pay test (A1) and processor/AV quotes (A3/A5).**

---

## 7. Compliance & Safety → Concrete Design Requirements

> **Legal status of this section:** every conclusion below marked `[HYPO-LEGAL]` is an **unconfirmed legal/tax hypothesis used as a design driver, NOT advice and NOT counsel-reviewed.** The disclaimer and the conclusions must not undercut each other: where this section says "stays out of scope" or "no designated-agent duty," read "**we hypothesize X; counsel must confirm before we rely on it or state it to creators.**" The app ships prominent disclaimers that it provides tooling, not legal/tax advice.

| Requirement | Vector | Concrete design requirement | Status |
|---|---|---|---|
| **2257 record-keeping** | 18 U.S.C. 2257 / 28 C.F.R. 75 — gov-ID, legal name, aliases, DOB, production date per performer; custodian statement; retention; criminal liability | **Encrypted 2257 Records Vault**: structured per-performer records, auto-generated custodian statement, indexed cross-reference, retention reminders, encrypted at rest | `[FACT]` statute; **`[HYPO-LEGAL]` secondary-producer scope (A12)** |
| **Consumer age verification** | *Free Speech Coalition v. Paxton* (SCOTUS, 2025); growing US-state list; UK OSA; EU DSA Art. 28 | **Hypothesis:** binds *platforms*, so a non-distributing local app is out of scope. Where the Website Builder fronts direct sales → per-jurisdiction age-gate brokering Yoti/VerifyMy/Sumsub. **AV cost gates this (A5).** Law specifics change fast — **re-verify the state/country list at build** | `[FACT]` ruling exists; **`[HYPO-LEGAL]` scope; `[EST]` specifics (A5/A11)** |
| **GDPR / PII** | Sex-life data = GDPR Art. 9 special category + CCPA/CPRA sensitive PI | Local-first ⇒ **hypothesis: creator is data controller, not us.** Consent capture, minimization, encryption, right-to-erasure tooling | `[HYPO-LEGAL]` controller status |
| **DMCA / leaks** | TAKE IT DOWN Act (FTC enforcement May 2026, 48-hr SLA, ~$53,088/violation); DMCA 512(c) | **Notice generator + leak tracker + fingerprint registry** ([§4.13](#413-leak-monitoring--takedown-orchestration)); integrate/export to BranditScan/Rulta | `[FACT]` figures (A11); **`[HYPO-LEGAL]` that staying local = out of scope / no designated-agent duty** |
| **Taxes** | IRS 1099-NEC; ~15.3% SE tax; W-8BEN/backup withholding; intl VAT/GST | **Multi-platform tax dashboard** + quarterly SE estimator + deductible tracker + VAT/GST flags; **informational, not advice** | `[FACT]` US framework; **non-US differs (A2/[§7d](#7d-localization--non-us-scope))** |
| **App-store bans** | Apple 1.1.4 + Google Play prohibit explicit apps | **Desktop-first mandatory** — signed Windows/macOS installer. *But note: store bans the STORE listing, not a companion mobile web/PWA — see [§13](#13-mobile-reality--companion-experience)* | `[FACT]` |
| **Credential security** | Storing logins/cookies = ToS + breach liability for a top-targeted population | OS-keychain storage, never plaintext; key rotation; kill switch ([§4.15](#415-settings--security--emergency-controls)) | `[FACT]` |
| **Platform ToS / AI-chat ban** | OF bans automation + AI-written DMs | **Human-assist by design**; draft-not-send; official API where it exists; explicit consent before any unofficial connector | `[FACT]` ToS; see Risk #1 |

### 7d. Localization & Non-US Scope `[BET]`
The sections above are **overwhelmingly US-centric**, yet adult creators are heavily international (EU/UK/LatAm/SEA). This is **explicitly scoped as US-first v1, with international as a deliberate later phase**, because:
- **Tax** differs entirely (VAT/GST regimes, no 1099, different SE-tax analogues) — the dashboard must be built with a **jurisdiction abstraction** even if only US ships first.
- **Age-verification law** varies by country (UK OSA vs EU DSA vs US-state patchwork) — the AV router already assumes per-jurisdiction logic; populate non-US rules later.
- **Processor mix** differs outside the US (Verotel/CCBill are global but terms vary; local processors exist per region).
- **Action:** build the abstractions now, ship US rules first, **size and scope the EU/UK market as a separate exercise** rather than assuming the US design ports.

---

## 8. Bundled MCP Servers

Posture: bundle safe local servers **enabled-by-default**; social/storage/payments connectors **opt-in with the user's own keys**; never auto-route adult payments through SFW-only processors.

### Preloaded set
- **Official local utilities (default on):** filesystem (sandboxed), fetch, memory, sequential-thinking, time, git — MIT, zero-auth `[FACT]`. *(Several once-common servers are archived — use maintained replacements.)*
- **Local media stack:** FFmpeg + ImageMagick MCP (bundled binaries) for transcode/resize/**watermarking** and the [§4.3](#43-content-production--repurposing-new--the-actual-1-pain) teaser/clip pipeline — fully local, explicit media never hits a cloud API.
- **Adult-aware social posting (opt-in, per-network NSFW guardrails):** Bluesky (App Password; adult-tolerant w/ labels), X (user's paid key; sensitive-media flag), Telegram (BotFather token), Reddit (**user's existing app credentials** — *new free keys reportedly closed Dec 2025, re-verify A10*).
- **Cloud storage + calendar (opt-in):** official remote endpoints + CalDAV fallback (privacy-first).
- **CRM/notes backends (selectable):** Notion + Airtable for non-technical users; **local SQLite** via our own MCP for privacy-max.
- **Research/scraping:** Firecrawl (default), Bright Data (power-user leak monitoring).
- **SFW-only payments:** Stripe official MCP **explicitly walled off** from adult revenue.

### Custom server — **Pink Battleship MCP**
A bundled **local stdio MCP server** (FastMCP / TS SDK, no auth as a child process) exposing the app's data as **resources** (galleries, per-platform stats, calendar, fan/PPV CRM, earnings) and **tools** (`schedule_post`, `tag_asset`, `query_earnings`, `draft_dm`), so the local model reasons over the creator's *actual cross-platform business data* on-device. **This is a near-term capability advantage, not a structural moat** (it's an assembly of open components — see [§2a](#2a-moat-durability--the-honest-version)).

**Do NOT bundle** mainstream aggregators (Ayrshare/Publora) as the adult poster — explicit-content policies unconfirmed and underlying networks largely ban hardcore content.

---

## 9. Recommended Architecture & Tech Stack

- **Shell:** **Electron** (Windows-first, macOS second), **code-signed installer / direct download** — desktop mandatory (app stores ban explicit apps). CreatorHero/OnlyMonster prove desktop works here.
- **Local-first data plane:** **SQLite + FTS5** (`better-sqlite3`) as catalog/CRM/stats/job store, **encrypted at rest** (SQLCipher or libsodium/AES-256-GCM, key in OS keychain).
- **Secrets:** **Electron safeStorage** → Windows Credential Manager / macOS Keychain / libsecret; detect Linux plaintext fallback. (Avoid deprecated `node-keytar`.)
- **Media:** **sharp/libvips**, **bundled ffmpeg** (poster frames, WebVTT sprites, teaser/clip pipeline), **exiftool** out-of-process. Watch licensing — ship LGPL ffmpeg, prefer permissive dedupe (dHash/aHash or embeddings + hnswlib, *not* GPLv3 pHash).
- **AI inference:** bundled **Ollama** (local baseline, subject to model-license clearance A6); ONNX Runtime / Python sidecar for JoyTag + NSFW scoring; OpenAI-compatible client for hosted providers.
- **Cloud storage:** single **S3-compatible client** (AWS SDK v3) + client-side rclone-crypt-compatible encryption + zero-knowledge backup ([§4.11](#411-cloud-storage--encrypted-backup)).
- **MCP:** custom local stdio server + bundled official/community servers via `npx`/`uvx`.
- **Help/onboarding:** MIT-only tour libs (react-joyride + Driver.js), FlexSearch offline docs, local RAG via node-llama-cpp/Ollama.

### 9a. The Thin Hosted Component — First-Class Architecture & Threat Model
This is **not a footnote.** A logically separate hosted component is **load-bearing for Paid Galleries, the Website Builder, AV brokering, and webhooks** — and it carries real compliance/ops surface. It is the **single deliberate exception** to "everything local," and it is specified as such:

- **What it does:** (a) receive payment-processor webhooks/postbacks; (b) host the compliant checkout landing page + serve expiring signed gallery links; (c) deploy/host the SFW website shell; (d) broker AV calls (pass-through).
- **What it must NEVER hold:** creator platform logins, the credential vault, raw explicit media of record, fan PII beyond what a checkout requires, or 2257 records. Explicit media stays on Bunny.net/platforms; the component handles **signed-URL plumbing and SFW shell assets only.**
- **Threat model:** it is the most exposed surface. Design as **stateless where possible, minimal-data, encrypted-in-transit, per-creator-scoped**, with the working assumption that it could be compromised — and that such a compromise must **not** expose logins, the vault, or explicit content of record.
- **Cost & business-model impact:** it is the recurring marginal cost that complicates a pure one-time license — see [§6a](#6a-pricing-business-model--unit-economics-proposed).
- **Open decision:** **we host it (more friction-free, more liability) vs. creator brings own host (less liability, more setup friction)** — see Risk #2.

---

## 10. Phased Roadmap — Riskiest-Assumption-First

**Assumptions:** small founding team (≈2–4 builders); time bands are rough **`[EST]`** and dependency-ordered, not commitments. **The ordering principle is: validate the biggest, cheapest-to-test unknowns before building the expensive stack.** The two existential unknowns are **(1) will solo creators install a desktop app and trust it with logins/IDs, and (2) will they pay a flat fee** — both must be probed *before* the heavy DAM/AI/payments build.

### Phase 0 — Validation & Trust Spike (~weeks, before heavy build)
*Front-load the riskiest assumptions (A1, A8) at lowest cost.*
- **Problem/WTP interviews** with 15–25 solo multi-platform creators; **paid pre-order / LOI** test of the pricing hypothesis ([§6a](#6a-pricing-business-model--unit-economics-proposed)).
- **Trust spike:** code-signing + notarization in place; a **bare "local-only, no telemetry" reader** (connect Chaturbate official + import one CSV, see a net P&L) — the minimum that tests *"will she install a desktop binary and trust it at all?"*
- **Legal pre-flight:** kick off counsel review of the highest-liability hypotheses (A6 LLM licenses, A8 session-bridge, A11/A12 scope) — these gate later phases.
- **Go/no-go gate** on observed demand + willingness-to-pay before Phase 1.

### Phase 1 — MVP / Lovable Core ("the honest cockpit")
*Depends on Phase 0 go. Goal: she sees her whole business in one local, private place and trusts how it connects.*
- Connector framework + **risk labels** + **connector health monitor**; **Chaturbate (official)** + **Fanvue (official)**; **manual-assist (CSV/email/manual)** for OF/Fansly/ManyVids/Tryst.
- **Migration import** (Infloww/CreatorHero/OF-export/CSV) — switching cost is acquisition.
- **Unified P&L (gross + net)** with configurable, dated rates + core KPI panel (labeled ranges, not targets).
- **Master Gallery & DAM** core + **local NSFW auto-tagging** (license-cleared/BYO) + safe-mode + default-on EXIF strip + dedupe.
- **AI assistant** baseline (license-cleared local/BYO + policy router + data-sensitivity guard + **safety policy spec [§5a](#5a-safety-policy-spec-testable-acceptance-criteria--highest-liability-behaviors)** + creator hard-boundary list); DM/caption **drafting**.
- **Security foundation:** OS-keychain secrets, encryption at rest, **2257 Vault**, **kill switch**, **opt-in zero-knowledge backup + tested restore** (day one, not later).
- **Trust package v1:** signed/notarized builds, "no telemetry" attestation, "what leaves your machine" inspector ([§14](#14-trust--security-package)).
- **Onboarding:** profiling wizard + checklist + tours (MIT stack).
- **Bundled MCP:** local utilities + Pink Battleship MCP (read) + local media stack.

### Phase 2 — Monetize, Operate & Produce
- **Content Production module** ([§4.3](#43-content-production--repurposing-new--the-actual-1-pain)) — shoot planning, one-shoot→N-deliverables, SFW/teaser auto-variants, VOD clipping. *(High priority: it's the stated #1 pain.)*
- **Paid Galleries & Checkout** + **chargeback evidence kit** + crypto failover + watermarking + **thin hosted component ([§9a](#9a-the-thin-hosted-component-first-class-architecture--threat-model))** with its threat model.
- **Scheduler/Calendar/Notifications** + **per-platform account-safety monitor** ([§4.9](#49-account-safety--per-platform-health-monitor-new--operationalizes-the-trust-promise)).
- **Cloud Storage** S3 connector (B2 default) + client-side encryption + policy advisor.
- **Analytics upgrade:** explainable suggestion engine, churn/win-back, fan/whale CRM, best-time.
- **Financial-health module** ([§4.7](#47-financial-health--income-smoothing-new)).
- **Companion mobile read-only view** ([§13](#13-mobile-reality--companion-experience)) — closes the desktop-only adoption gap.
- **VA-mode seam** activated for early team users (architecture was built in Phase 1).
- **AI:** persona profile, local fan-CRM memory, failover chain.

### Phase 3 — Own the Brand, Defend & Scale
- **Website Builder** + per-jurisdiction age-gate (**gated on AV unit economics A5**) + templates + link-in-bio + compliance advisor.
- **Compliance suite:** DMCA + TAKE IT DOWN generator + fingerprint registry; **multi-platform tax dashboard**; **leak-monitoring orchestration** ([§4.13](#413-leak-monitoring--takedown-orchestration)).
- **Cam bridge depth** (MFC/Stripchat listeners); traffic-source LTV attribution; cohort benchmarking.
- **Full multi-user/VA mode** UI + encrypted shared layer.
- **Custom CCBill/Segpay/crypto MCP adapter**; multi-host failover.
- **International expansion** (EU/UK tax + AV rules) per [§7d](#7d-localization--non-us-scope).
- **OnlyFans/Fansly broker/session-bridge** — *only if Risk #1 resolves to ship it.*

---

## 11. Top Risks & Open Decisions (Founder's Call)

**0. (NEW, foundational) No primary demand evidence.** Every gap is inferred from competitor feature matrices, not from creators; the audience is **mobile-first** and may reject a desktop install (see [§13](#13-mobile-reality--companion-experience)). *Recommendation: Phase 0 must validate demand, desktop-willingness, and willingness-to-pay before heavy build (A1).* **This is the top risk; all feature work is downstream of it.**

**1. OnlyFans support — and the broker contradiction, resolved.** OF is the market, has no API, and **bans automation of any kind** — so the repeatedly-asserted "reading our own session is more ToS-aligned / lowest ban surface" claim is **legally optimistic and is hereby hedged: reading your own session programmatically is still automation and still bannable (A8).** *Resolved stance for consistency: **ship manual-assist as the default and only OF/Fansly path at launch. The broker AND session-bridge are NOT built in Phase 1; they remain a deferred, behind-a-decision option, not a Should.*** Offering a broker connector at all makes Pink Battleship arguably complicit in account losses (A7) — **Decision: do we ever ship the automated path, or commit to assist-only for maximum defensibility and trust?** Everything else in this doc is written to the assist-only default.

**2. The thin hosted component.** Required for checkout/webhooks/AV/site ([§9a](#9a-the-thin-hosted-component-first-class-architecture--threat-model)). **Decision: we host it (less friction, more liability + recurring cost) vs. creator brings own host (more friction, less liability)?** Affects both [§6a](#6a-pricing-business-model--unit-economics-proposed) economics and liability footprint.

**3. Pricing — now a concrete hypothesis, still needs validation.** Recommendation in [§6a](#6a-pricing-business-model--unit-economics-proposed): **flat ~$29–49/mo per creator** (anti-agency), with a one-time-license alternative to A/B. **Decision: subscription vs one-time vs freemium — settle via the Phase 0 WTP test (A1).**

**4. AI explicit-quality vs. footprint vs. licensing.** Good local output needs a GPU; **and several candidate models may be license-incompatible for bundling (A6).** *Recommendation: BYO-model/user-download for any uncleared model; steer GPU-less users to BYO Venice/Featherless.* **Decision: default bundled (cleared) model size vs install weight; how hard to push BYO.**

**5. Compliance liability boundary.** The 2257 vault, AV routing, and DMCA generator are differentiators but rest on **unconfirmed legal hypotheses** ([§7](#7-compliance--safety--concrete-design-requirements), A11/A12). *Recommendation: tooling + disclaimers + CPA/attorney prompts, never auto-file.* **Decision: get counsel sign-off on 2257 secondary-producer scope, covered-platform/designated-agent boundary, and data-controller status before shipping these as claims.**

**6. Payments concentration & complicity.** Even with failover, our checkout brand could be associated with adult merchants. **Decision: facilitate checkout (own the money flow, more value, more exposure) vs. display-only (far safer)?**

**7. Distribution (see [§12](#12-go-to-market--distribution)).** Mainstream ad networks ban this audience; **discovery is existential and unsolved.** **Decision: which 1–2 channels (creator Discords/Reddit/X, agency word-of-mouth, affiliate) do we bet the launch on?**

---

## 12. Go-to-Market & Distribution

**For a population that Google, Meta, TikTok, and the app stores will not let you advertise to, distribution is existential — not a marketing afterthought, and arguably harder than the build.** `[BET]` This was absent from the prior draft; it is a first-class workstream.

- **Channels that are actually open** `[BET]`: creator-focused **subreddits and X/Twitter adult-creator circles**; **creator Discord/Telegram communities**; **word-of-mouth and referral** (the audience is tight-knit and trust-driven); **affiliate/revenue-share for referrers**; **agency back-channels** (even though we're anti-agency-pricing, agencies and consultants influence tool choice); **content marketing/SEO on adult-permissible terms**; **partnerships with adult-friendly infrastructure** (processors, hosts, link-in-bio tools).
- **Trust-led GTM:** because this audience is paranoid (see [§14](#14-trust--security-package)), the security/privacy story *is* the marketing — published audit, open-sourced credential core, and a visible "what leaves your machine" claim are acquisition assets, not just features.
- **What won't work:** mainstream paid acquisition, App/Play Store discovery, most influencer platforms.
- **Open decision (Risk #7):** pick **1–2 beachhead channels** and a referral mechanic to test in Phase 0 alongside the WTP interviews — distribution and demand should be validated together.

---

## 13. Mobile Reality & Companion Experience

**The desktop-only stance is an adoption risk, not a clean win.** Cam models and OF creators do **enormous amounts of work from their phones**; a desktop-only product that holds the system of record but can't be touched from a phone may simply not fit the target's workflow. The prior draft hand-waved this. `[BET]`

- **Clarify the app-store fact:** stores ban the **store listing** of explicit apps — they do **not** prevent a **companion mobile web app / PWA** or a self-distributed mobile view. Mobile is therefore *available* to us; we chose desktop for the *heavy* workloads, not because mobile is impossible.
- **[Should — Phase 2] Lightweight companion mobile experience:** a **read-only, encrypted PWA/self-distributed view** for notifications, the **daily action queue**, **live cam-tip alerts**, and basic CRM lookups — riding the [§4.11](#411-cloud-storage--encrypted-backup) zero-knowledge sync. Heavy DAM/editing/production stays on desktop.
- This **closes the desktop-only adoption gap without touching app stores**, and pairs naturally with the multi-device backup story (a phone is just another authorized device).

---

## 14. Trust & Security Package *(a purchase driver, not nice-to-have)*

This audience is uniquely distrustful — **doxxing and extortion targets** — and will **not** casually hand an unknown desktop binary their platform logins and ID scans. Establishing trust is a **top-3 adoption barrier** and is treated as a product workstream and a GTM asset ([§12](#12-go-to-market--distribution)). `[BET]`

- **[Must] Code-signing + notarization** (Windows + macOS) — a noted existing asset; non-negotiable for installs.
- **[Must] "No telemetry / we literally cannot see your data" technical attestation** — backed by the local-first/zero-knowledge architecture, stated plainly and verifiably.
- **[Must] In-app "what leaves your machine" data-flow inspector** — shows, per feature, exactly which bytes egress and to whom (and confirms explicit media never does).
- **[Should] Open-source the credential-vault + "no telemetry" core** — let the paranoid audience (and their technical friends) verify the most sensitive code path.
- **[Should] Independent third-party security audit with a published report.**
- **[Could] Reproducible builds** — so a published binary can be verified against open source.

These directly de-risk the **Risk #0** adoption question: the cheapest way to learn whether creators will trust a desktop binary is to make trust *verifiable*, early.

---

*Architecture note: the **stateless, minimal-data, no-credential** hosted component for payment webhooks + compliant checkout landing pages + SFW site hosting (specified in [§9a](#9a-the-thin-hosted-component-first-class-architecture--threat-model)) is the single deliberate exception to "everything local." It holds no creator logins, no credential vault, and no raw explicit media of record. Everything else lives on the creator's machine.*

---

# Pink Battleship Product Blueprint — Addendum: OBS Integration, Packaging & Distribution

> Scope: three build-facing decisions for the Pink Battleship cockpit (Electron, multi-platform adult-creator business management). Opinionated and buildable. **Action item flagged throughout:** items marked **⚠ re-verify at setup** depend on policies/pricing/eligibility that shifted repeatedly through 2025 and must be re-confirmed when you actually provision.

---

## A. OBS Studio Integration

OBS is the universal broadcast layer for cam models, and since OBS 28 it ships **obs-websocket v5 built-in** — no plugin install. Pink Battleship should treat OBS as a fully scriptable, AI-orchestrated component of the cockpit by embedding the **obs-websocket-js** client directly in the Electron **main process**. The defensible play is fusing two data planes nobody else unifies: the **OBS control plane** (obs-websocket) and the **platform tip/event plane** (Chaturbate Events API, OnlyFans/Fansly). That closes the loop between an earnings event and stream production — a tip can fire an overlay alert *and* an OBS action in the same beat.

### Architecture

Protocol: JSON-over-WebSocket, default port **4455**, optional SHA256 challenge-response auth, **RPC v1**. obs-websocket-js (latest 5.0.8, MIT) handles the Hello → Identify → Identified handshake, request batching, and typed events.

Five layers, all in/near the main process:

| Layer | Responsibility | Key calls / mechanism |
|---|---|---|
| **1. OBS Control Service** (main proc) | Single long-lived `ws://127.0.0.1:4455` connection; reconnect-with-backoff (OBS may launch after Pink Battleship); typed command API; surfaces conn state to renderer over IPC | `obs.connect(url, password, {eventSubscriptions, rpcVersion:1})`, `obs.call(...)`, `obs.callBatch([...])` for atomic multi-step scene changes |
| **2. Event/Telemetry bus** | Forward pushed OBS events onto internal bus; **1–2s poll** of request-only stats; persist rolling buffer for analytics | events: `StreamStateChanged`, `RecordStateChanged`, `CurrentProgramSceneChanged`, `ReplayBufferSaved`, `InputMuteStateChanged`, `SceneItemEnableStateChanged`; polled: `GetStreamStatus`, `GetStats` |
| **3. Platform Event Ingest** | Chaturbate Events API long-poll (read `events[]` + `nextUrl`, immediately re-request; default 10s / max 90s timeout; rate limit 2000 req/min); normalize tip/chat/follow/mediaPurchase into the same bus. OnlyFans/Fansly via webhook/relay or existing scrape/session | **⚠ security:** Chaturbate token lives in the polling URL and exposes private messages — OS keychain only, never transmit off-device, never log |
| **4. Automation Rules Engine** | Subscribes to unified bus, maps platform events → OBS commands. **Deterministic, declarative JSON** for live-show reliability; AI authors/edits rules but is not in the live hot path | e.g. `tokens>=goal` → `callBatch([SetCurrentProgramScene GOAL, SetSceneItemEnabled confetti=on])` + `SaveReplayBuffer` |
| **5. Overlay Server** | Tiny **localhost-only** Express/HTTP server serving tip-goal/alert HTML; renderer overlay subscribes over local WS/SSE; model adds `http://127.0.0.1:<port>/overlay/...` as an OBS Browser Source | keeps tip data + tokens entirely on-device (managed evolution of the paulallen87 pattern) |

**Multistream caveat:** obs-websocket controls only the *single configured* output — it cannot create extra RTMP outputs. For true multistream Pink Battleship must either (a) drive a local plugin (**Aitum Multistream** or **Multiple RTMP** / OBS 30.2 Multitrack) and pre-write its config, or (b) point OBS's single output at a cloud relay (**Restream/Streamster**, the latter explicitly adult-cam-focused). Auto-pick by detected upload bandwidth (local multi-1080p needs ~50+ Mbps up) and generate per-platform encoder profiles respecting caps (**Chaturbate up to 4K/30Mbps, Stripchat 1080p/6Mbps**).

**Packaging note:** all deps are pure JS (obs-websocket-js, ws, express) — no native modules, no electron-rebuild, zero impact on the signed installer pipeline in Section B.

### Feature list (MoSCoW)

| Feature | Tag | Complexity | Why |
|---|---|---|---|
| Embedded OBS control via obs-websocket-js | **Must** | Low | Foundation. Auto-detect `localhost:4455`, guided onboarding to enable server + paste password. Expose stream/record, scene switch, source/filter toggles, virtual cam, transitions as cockpit buttons. |
| Live stream-health monitor | **Must** | Low | Poll `GetStreamStatus`+`GetStats`: bitrate, dropped/skipped frames (`outputSkippedFrames`), `outputCongestion`, CPU/mem, uptime, color-coded. Dropped frames = lost income → proactive "stream degrading" alert. |
| **Tip-triggered scene & overlay automation** | **Must** | High | The signature differentiator. Rules engine maps Chaturbate tip/goal/follow → `SetCurrentProgramScene` / `SetSceneItemEnabled` / `SetSourceFilterEnabled` + overlay alert. No existing tool wires adult-platform tips to OBS production. |
| Adult-platform tip-goal & alert overlays (browser source) | **Must** | Medium | Streamlabs-quality goal bars / ticker / alert box / recent-tipper widgets, but fed by Chaturbate/OnlyFans/Fansly data Streamlabs & OWN3D structurally don't serve. Served from localhost so the token never leaves the machine. |
| **AI auto-highlight clipping on tip spikes** | **Should** | High | Keep replay buffer running; on tip spike / goal hit, call `SaveReplayBuffer` (listen for `ReplayBufferSaved`), auto-tag/organize clips for OnlyFans/social. Gaming clippers (Eklipse/Powder/Medal) can't see the tip signal. |
| One-click multistream setup | **Should** | Medium | Per-platform output profiles + configure Aitum/Multiple-RTMP or point at a relay; detect upload speed to recommend local vs cloud. |
| Live stats + tip events → analytics dashboard | **Should** | Medium | Pipe OBS telemetry (duration, dropped frames, scene-time, bitrate-over-time) + tip timeline; correlate which scenes/times/overlays drive the most tips. |
| AI-assistant natural-language OBS control | **Could** | Medium | "start my BRB scene," "save that clip," "why is my stream lagging?" → read `GetStats` and explain. Low incremental cost once the control layer exists; secondary to the deterministic engine for live reliability. |
| Scene/overlay template marketplace & onboarding presets | **Could** | Medium | Starter collections (Intro/Main/Goal-Hit/BRB/Private) pre-wired to the rules engine — production-ready in minutes. |
| Multi-PC / network OBS control | **Won't (v1)** | High | Exposing obs-websocket beyond localhost is a real attack surface (password is the only gate). Keep v1 localhost-only. |

### Standout / differentiating features

- **AI-driven scenes** — deterministic rules engine + AI rule-authoring maps live earnings events to production, with a global **kill-switch / panic scene** and dry-run preview (misfiring a hidden source mid-broadcast is high-stakes for an adult creator).
- **Tip-triggered overlays** — the same browser-source polish as mainstream tools, but wired to adult-platform tip data that Streamlabs/OWN3D lock out. This is an open field.
- **Auto-clip highlights on tip spikes** — the tip/goal milestone is the natural "best moment" marker gaming clippers can't access; turns live camming into a sellable-content pipeline.
- **Multistream** — one-click per-platform encoder profiles spanning local plugins and cloud relays, eliminating today's error-prone manual config.
- **Stream-health → analytics** — fuses OBS session telemetry with the tip timeline so production data becomes earnings optimization.

**Key risks:** Chaturbate token privacy (keychain + localhost-only, never off-device); obs-websocket connection friction (#1 support issue — mitigate with auto-detect + guided onboarding + reconnect/backoff); local multistream eating the creator's upload bandwidth; platform ToS / events-API instability (OnlyFans/Fansly have no official events API → fragile scraping); obs-websocket protocol drift (pin the lib, check `rpcVersion`, degrade gracefully); live-show reliability (deterministic + tested + panic scene); keep the stats poll throttled to ~1–2s so Pink Battleship never adds to dropped frames.

---

## B. Packaging, Code Signing & Auto-Update (Win + Mac)

**Recommended toolchain:** `Electron + electron-builder → NSIS (one-click) + portable on Windows, signed/notarized DMG on macOS → electron-updater via public GitHub Releases. Sign Windows with Azure Trusted Signing (~$120/yr), Mac with an Apple Developer ID (~$99/yr). Realistic recurring cost: ~$220/yr.`

Stay on Electron — Pink Battleship already ships Electron installers, and electron-builder's multi-target + cloud-signing + auto-update story is more turnkey than Electron Forge. Don't migrate; don't rewrite to Tauri (same external cost realities, far less mature ops story).

### The signing reality (read this first)

The single fact that should reshape the current plan: **as of March 2024, EV code-signing certs no longer grant instant SmartScreen reputation.** EV and OV are now treated identically — both must build reputation through clean download volume. So paying ~$300–700/yr for an EV cert "to clear SmartScreen" is **wasted money.**

- The **current self-signed Windows cert must be retired.** SmartScreen and Windows 11 Smart App Control treat self-signed exactly like unsigned (Smart App Control can *block* outright, not just warn), and self-signed **breaks electron-updater silent-update signature validation**.
- The cheapest credible non-scary Windows path is **Microsoft Azure Trusted Signing** (now branded "Artifact Signing"): short-lived certs from a Microsoft-operated CA, **no hardware token** (works in CI), integrates via `win.azureSignOptions`. ~**$9.99/mo Basic** (5,000 signatures) ≈ $120/yr. **⚠ re-verify at setup:** individual onboarding is **US/Canada only** (orgs US/CA/EU/UK with ~3-yr business history); confirm whether you sign as an individual or as Corner Spore LLC.
- **It still does NOT instantly silence SmartScreen.** Only the Microsoft Store re-signs apps to fully bypass it — and the **Store is realistically off-limits** for adult-creator tooling (IARC adult-theme / targeting rules → poor, risky fit). Plan for SmartScreen to warn on early downloads regardless of cert; reputation fades only with volume.
- **CA/Browser Forum CSC-31:** from **March 1, 2026**, public OV/EV cert max validity drops to ~460 days (more renewal churn). Azure Trusted Signing's short-lived model sidesteps this — another reason to prefer it over a traditional cert. **⚠ re-verify** if you fall back to OV.

### Notarization (macOS — non-negotiable)

The Mac path is unambiguous: **Apple Developer Program ($99/yr) → Developer ID Application cert → hardened runtime + entitlements → Apple notarization (`notarytool`) + stapling.** Without notarization the app shows "unidentified developer" / Gatekeeper blocks **and** electron-updater silent updates fail.

- `hardenedRuntime: true`; add `com.apple.security.cs.allow-jit`; on Electron 12+ **do NOT** add `allow-unsigned-executable-memory` (expands attack surface).
- Staple **both** the `.app` and the `.dmg`.
- Use the **App Store Connect API key** (`APPLE_API_KEY` / `_ID` / `_ISSUER`) over Apple-ID + app-specific-password for CI.
- Ship a **universal (arm64 + x64)** build or separate DMGs — Apple Silicon dominance means Rosetta friction is a bad first impression.
- **⚠ pin versions:** 2025 saw "invalid signature" notarization regressions on Electron 36–38 / electron-builder 26.x despite passing local `codesign`. Lock a verified Electron + electron-builder matrix and test notarization in CI before relying on it.

### Auto-update

**electron-updater + GitHub Releases** matches the "hosted on GitHub" goal and is turnkey in electron-builder: publish installers + `latest.yml` / `latest-mac.yml` to a Release; the app reads, downloads, verifies signature, installs. Use **differential (block-map)** updates on Windows. **Silent updates require valid signatures on both OSes** — which is exactly why the signing work above is load-bearing. Keep the **release feed public** for frictionless, tokenless updates (private-repo handling covered in Section C).

### Recommended targets & cost

| Item | Recommendation | Tag |
|---|---|---|
| Windows installers | NSIS one-click **+** portable single-exe (skip MSI unless enterprise/MDM) | Must |
| macOS installer | DMG (skip PKG — only for system/daemon/kext installs) | Should |
| Windows signing | Azure Trusted Signing via `win.azureSignOptions` | Must |
| Mac signing | Apple Developer ID + notarize + staple both .app/.dmg | Must |
| Auto-update | electron-updater + public GitHub Releases, block-map deltas | Must |
| CI signing | GitHub Actions secrets (Azure service principal w/ "Trusted Signing Certificate Profile Signer" role; App Store Connect API key) — no local cert | Should |
| Universal mac binary | arm64 + x64 | Should |
| Stable publisher identity | Lock one identity (Corner Spore entity) — reputation compounds, changing certs resets it | Should |
| First-run SmartScreen note | Onboarding tells early adopters about "More info → Run anyway" + verified publisher name | Should |
| Microsoft Store | **Won't** — content-policy risk; ship signed installers from GitHub | Won't |
| EV cert "for SmartScreen" | **Don't buy** — no longer grants instant reputation | (avoid) |

**Realistic recurring cost: ~$220/yr** ($99 Apple + ~$120 Azure Trusted Signing Basic), plus **~3–6 focused days** of CI plumbing (Win ~1–2d incl. identity-validation wait, Mac ~1–2d incl. 24–48h enrollment, auto-update wiring ~1d). This is configuration + spend, not re-architecture. Azure Trusted Signing gotchas: short cert-profile validity (must re-sign within the window; timestamped binaries stay valid forever), slow signing (~5–10s/file, no parallelism), headless-CI `az login` needs a service principal.

---

## C. GitHub Hosting, CI/CD & Docs

GitHub is technically excellent and free for this entire stack — and you've already built the exact pipeline twice (Switchboard, MCP Command Center). The **policy layer is now the dominant risk**, addressed in the verdict below.

### Release pipeline (tag-triggered Actions matrix)

On push of a `v*` tag, build **both platforms in parallel**, sign each, and publish artifacts + `latest*.yml` to a GitHub Release.

| Runner | Build / sign | Secrets |
|---|---|---|
| `windows-latest` | NSIS + portable, Authenticode (Azure Trusted Signing) | `CSC_LINK` (base64 .pfx) + `CSC_KEY_PASSWORD` *(or Azure SP creds for Trusted Signing)* |
| `macos-latest` | dmg/zip, `codesign` + `notarytool` notarization | `CSC_LINK`/`CSC_KEY_PASSWORD` (Developer ID .p12) + `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID` (or `API_KEY_ID`/`ISSUER_ID`) |

Reuse the proven base64-PFX pattern from MCP Command Center; publish with `electron-builder ... -p never` to avoid duplicate draft releases (use `softprops` or the builder's github provider for the actual upload). **⚠ cost note / re-verify:** macOS Actions minutes bill at **~10× on private repos** and the free tier (~2,000 private min/mo) can exhaust with frequent Mac builds; **public repos get unlimited minutes** — which tugs against the privacy recommendation below. Reconfirm current multipliers against your billing page; if private + frequent, budget for it or self-host a Mac runner.

**Note on current scaffold:** package.json today is Electron 33 / electron-builder 24, Win-only NSIS+portable, **no mac target, no publish block, no electron-updater, no Actions workflow**. Reaching the described state means adding a mac target, a publish provider, electron-updater wiring, and the release workflow.

**Private-repo auto-update (if you go private — see verdict):** do **NOT** embed a `GH_TOKEN` in the shipped installer (extractable, rate-limited, leak risk). Use `provider:'generic'` pointing at a **Cloudflare R2 bucket + Worker** that proxies the private release. If distribution can live in a clean public repo, electron-updater needs no token (or use `update.electronjs.org`).

### Docs site — pick ONE: **Astro Starlight on GitHub Pages (or Cloudflare Pages)**

Starlight wins for a **consumer, tutorial- and screenshot-heavy** app: built-in **Pagefind** client-side search (no SaaS), i18n, dark mode, MDX, fast static builds — and lighter than the alternatives for a Node/Electron team.

| Framework | Verdict |
|---|---|
| **Astro Starlight** | **Recommended.** Batteries-included for consumer tutorials; no external search service. |
| Docusaurus | Only if you need per-version docs trees + a built-in blog, or the team is React-heavy. Heavier/slower. |
| MkDocs Material | Only if your stack is Python (it isn't — adds a runtime). |
| VitePress | Great but leaner on consumer-tutorial features than Starlight. |

Deploy the static output via `actions/deploy-pages`. **Strongly prefer hosting the built site on Cloudflare Pages/Netlify** so a GitHub account suspension doesn't simultaneously kill the marketing/docs presence (decoupling, per the verdict).

### README / landing patterns

Mirror the polished MCP Command Center pattern: real screenshots, a **per-platform signed-download table**, CI badge, and a documented "More info → Run anyway" SmartScreen step in onboarding. **Frame the project consistently as professional creator-*business* software** — "multi-platform creator business management cockpit" — never explicit terms or platform-specific NSFW framing in the repo name, topics, README, or commit history. This is both good positioning and direct risk mitigation (see verdict).

### Verdict — GitHub content policy for an adult-creator tooling repo

**You CAN host the repo and SFW docs on GitHub, and it's the path of least friction — but treat it as a revocable convenience, not a foundation.**

The letter of GitHub's **"Sexually Obscene Content" AUP** (tightened Oct 2025) permits application code + SFW docs — code is not "graphic depictions of sexual acts." **The danger is enforcement, not the rulebook:** in **Nov–Dec 2025 GitHub ran a ban wave deleting ~80–90 repos / 40–50 developers who built adult-community *tooling and modding* code** (not explicit media), often nuking entire accounts with **no warning** and only generic appeals (at least one restored weeks later). Pink Battleship is squarely in that risk class.

**⚠ re-verify at setup:** GitHub has issued no public clarification on whether adult-creator *management* tooling is in or out of scope, the boundary is opaque T&S discretion, and both the AUP text and enforcement posture have moved fast — re-read the current policy and recent enforcement reporting when you provision, before committing the layout.

**Recommended posture (all Must):**

| Decision | Recommendation |
|---|---|
| Source repo | **PRIVATE.** Reduces discovery/flagging surface, protects integration code. |
| Docs/landing | **SEPARATE PUBLIC repo** (or non-GitHub host) with strictly SFW, clinical content — isolated so one enforcement action can't take both. Host the built site on **Cloudflare Pages/Netlify**. |
| Secrets | **Zero bundled secrets, ever** — certs/tokens/platform creds via Actions secrets + OS keychain (existing safeStorage/DPAPI pattern). Token-in-installer is independently bad practice and a secret-scanning flag risk. |
| Language | Clinical/business everywhere — repo name, README, topics, commits. Never explicit or NSFW-platform framing. |
| Exit plan | **Documented one-command mirror** (`git remote mirror`) to GitLab and/or self-hosted Gitea, plus a pre-wired alternate release/update host (Cloudflare R2 via `generic` provider), so a suspension is a DNS/config switch — not an extinction event. |

**Bottom line:** the technical pipeline is a solved, days-not-weeks problem you've shipped before. The mitigations above (private source, separate clean docs host, clinical language, zero bundled secrets, exit plan) are **mandatory, not optional**, and the policy specifics should be **re-verified at setup time** because they are set by opaque discretion that has been actively changing.

---

Relevant existing-project references for reuse during implementation: the MCP Command Center repo (base64-PFX signing pattern, tag-triggered Actions matrix, signed-download README table) at `C:\Users\sasha\Documents\Repos\mcp-command-center`, and the shared "Corner Spore" code-signing cert (to be **retired for public distribution** per Section B; documented in the user's `code-signing-cert.md` memory note).


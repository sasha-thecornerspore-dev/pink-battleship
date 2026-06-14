# Pink Battleship — Phase 1, Slice 1: "Foundation + honest P&L" — Design Spec

**Status:** Approved design (pre-implementation) · **Date:** 2026-06-13
**Parent blueprint:** [docs/Pink-Battleship-Blueprint.md](../../Pink-Battleship-Blueprint.md)
**Decisions locked:** assist-only OnlyFans stance · soft elegant pastel UI (selectable themes, *Blush & mauve* default) · Electron desktop · Approach A architecture (thin renderer / fat main / ports-and-adapters).

---

## 1. Purpose & context

Pink Battleship ("The Pink Battleship") is a local-first Windows/macOS Electron cockpit for multi-platform adult content creators. "Phase 1" in the blueprint is ~12 subsystems — too large for one plan. This spec defines **the first buildable vertical slice**: the spine every later module clips onto. It proves the full `connector → encrypted store → P&L` path end-to-end with real security, rather than building many half-stubs.

A creator can: launch the app, set a passphrase, connect Chaturbate (official API) and import a CSV, see a single honest **net** P&L across platforms, switch the pastel theme, inspect exactly what data leaves her machine, and panic-lock the vault — all local, no telemetry.

## 2. Scope

**In scope**
- App shell (electron-vite + React + TypeScript) and the pastel theming system (3 selectable palettes × light/dark).
- Encrypted local data core (SQLite + SQLCipher), OS-keychain key storage, passphrase-based app unlock, panic-lock/kill-switch.
- Connector port with **two drivers**: Chaturbate (official Events/Stats, fixture-first) and manual-assist (CSV import + manual entry).
- Connector health monitor + per-connector risk labels.
- Configurable, dated rate-rule engine and the gross/net P&L summary.
- Screens: Unlock, lightweight first-run profiling, Dashboard, Connectors, Import, Settings.
- Trust foundation: no-telemetry network gateway with host allowlist; "what leaves your machine" inspector.

**Out of scope (later slices — build the seam, not the feature)**
- DAM / galleries, NSFW auto-tagging, AI assistant + safety router, 2257 vault, Fanvue & email-parse drivers, scheduler/calendar, onboarding tours, bundled MCP servers, cloud backup/restore, OBS, paid galleries/checkout, website builder, signed/notarized release pipeline (wired when we first cut an installer, not blocking this slice).

## 3. Architecture (Approach A)

- **Main process (Node):** owns SQLite, encryption, keychain, connectors, the rate/P&L engine, and the single outbound **network gateway** — every external request funnels through it, is checked against a per-connector host allowlist, and is logged for the inspector.
- **Preload:** exposes a **typed, allowlisted IPC API** via `contextBridge`. No raw `ipcRenderer`, no Node primitives in the renderer. `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- **Renderer (React):** pure pastel UI; reads/writes exclusively through the IPC API; never touches secrets, the DB, or the network directly.
- **Core as ports & adapters** (plain Node, unit-testable without Electron):
  - `SecretStore` port → keychain adapter (Electron `safeStorage`).
  - `Database` port → SQLCipher adapter.
  - `Connector` port → `ChaturbateDriver`, `ManualAssistDriver`.
  - `NetworkGateway` → the only egress path; enforces allowlist, writes `egress_log`.
  - `RateEngine` / `PnlService`.

**IPC contract (v1):** `vault:unlock`, `vault:lock` (panic), `vault:status`, `connectors:list`, `connectors:connect`, `connectors:sync`, `import:csv`, `transactions:query`, `pnl:summary`, `rates:list`, `rates:upsert`, `settings:get`, `settings:set`, `privacy:dataFlows`. All payloads typed in `src/shared`.

## 4. Repo layout

```
Pink Battleship-desktop/
  src/main/        electron main: app lifecycle, ipc handlers, network gateway
  src/preload/     typed contextBridge API surface
  src/renderer/    react UI: screens/, components/, theme/ (tokens)
  src/core/        plain-node domain:
                     db/        sqlcipher adapter, migrations
                     crypto/    key gen, argon2id wrap/unwrap, panic-lock
                     secrets/   keychain adapter (safeStorage)
                     connectors/ port.ts, chaturbate/, manual/, health.ts
                     pnl/       rate-engine, pnl-service
                     privacy/   egress gateway + log
  src/shared/      ipc contract types, domain models
  test/            unit/ (vitest)  e2e/ (playwright)
  electron-builder.yml, electron.vite.config.ts, package.json
```

## 5. Data & security core

- **Encryption:** SQLite via `better-sqlite3` with **SQLCipher** (whole-DB, AES-256). The DB key is a random 32-byte value.
- **Key storage & unlock (defense in depth):** the DB key is wrapped by a passphrase-derived key (**Argon2id**); the wrapped blob lives in app data, and the OS keychain (`safeStorage`, DPAPI / macOS Keychain) additionally encrypts that blob at rest. By default the passphrase is required every launch — neither disk access nor keychain access alone opens the vault. Only if the user opts into "remember on this device" does the keychain hold the unlock key for automatic launch on that trusted machine.
- **First run:** generate DB key → prompt passphrase → wrap & persist → open DB.
- **Launch:** Unlock screen → passphrase → unwrap key → open DB.
- **Panic-lock / kill switch (in-slice):** zeroize the in-memory key, close the DB handle, return to Unlock. Remote-wipe token is deferred.
- **No telemetry:** there is no analytics/crash endpoint anywhere in the codebase. The network gateway **refuses any host not on a connector's declared allowlist** (fails closed).

**Schema (slice):**
| Table | Key columns |
|---|---|
| `platforms` | id, name, kind |
| `connectors` | id, platform_id, driver, risk_label, status, last_sync_at, config (encrypted JSON) |
| `transactions` | id, connector_id, platform_id, occurred_at, gross_amount, currency, kind (`tip`/`sub`/`ppv`/`clip`/`other`), external_id, payer_ref, raw (JSON) |
| `rate_rules` | id, platform_id, kind (`platform_cut`/`processor_fee`), rate, fixed_fee, effective_from, effective_to, note, is_estimate |
| `settings` | key, value |
| `egress_log` | id, ts, connector_id, host, purpose |

## 6. Connector layer

- **`Connector` port:** `connect(config)`, `sync() → Transaction[]`, `healthCheck() → 'healthy' | 'needs_sync' | 'broken'`, plus static `riskLabel` and `dataFlows` (declared outbound hosts + purpose).
- **Chaturbate driver (official):** Events/Stats long-poll via the network gateway; token in keychain; normalizes tips/token-purchases/sub events into `transactions`. **Fixture-first:** ships a mock mode driven by recorded JSON fixtures so the whole path is testable offline and in CI without a real account. Risk label: *Official API — low risk.*
- **Manual-assist driver:** CSV import with a column-mapping step + manual single-entry; the durable floor for no-API platforms (OF/Fansly/ManyVids). Risk label: *Manual — no automation, zero ban risk.*
- **Health monitor:** tracks each connector's state; a `broken` official connector **fails safe** (stops polling, raises an alert, the UI nudges toward manual-assist) rather than retrying aggressively.

## 7. P&L engine

- **Dated, configurable rate rules** (never hardcoded). For a transaction, `net = gross − platform_cut − processor_fee`, choosing the rule whose `[effective_from, effective_to)` covers `occurred_at`. Defaults are seeded as **editable estimates** (`is_estimate = true`) and clearly labeled as such in the UI.
- **`pnl:summary`** returns: gross, total cuts/fees, net, per-platform breakdown (with each platform's data source tag), active-fans count (distinct `payer_ref`), and a daily net series — exactly what the Dashboard renders.

## 8. UI & theming

- **Theme system:** design tokens expressed as CSS variables, themed with Tailwind v4; **3 palettes** (Blush & mauve default, Lavender & pearl, Rose & sage) × light/dark, switchable live in Settings and persisted in `settings`.
- **Components:** Radix UI primitives styled to the pastel tokens (accessible, unstyled base — no fighting a pre-themed kit).
- **Screens:**
  - **Unlock** — passphrase gate (first-run sets it).
  - **First-run profiling (lightweight)** — "which platforms do you use?" → seeds `platforms` + suggested connectors.
  - **Dashboard** — the approved mockup: net hero, gross→cuts→net metric cards, per-platform breakdown with data-source tags, 30-day net sparkline, connector-health line, persistent "nothing leaves this device" chip.
  - **Connectors** — list, connect, health, risk labels.
  - **Import** — CSV upload + column mapping + preview.
  - **Settings** — theme picker, rate-rule editor, passphrase change, panic-lock.

## 9. Trust foundation

- **"What leaves your machine" inspector:** renders each connector's declared `dataFlows` plus the live `egress_log`. In this slice the only egress is the Chaturbate API host; everything else shows *nothing leaves this device*.
- **No-telemetry attestation** surfaced in the UI, backed by the fail-closed gateway.

## 10. Testing (TDD — test-first)

- **Unit (Vitest):** Argon2id wrap/unwrap + key zeroization; rate-rule resolution + net math (incl. date-boundary and overlapping-rule cases); CSV parse/mapping (incl. malformed rows); Chaturbate driver against fixtures; health-monitor state machine; **egress-gateway allowlist enforcement (fails closed)**.
- **E2E (Playwright):** first-run set passphrase → connect Chaturbate (mock) → import CSV → correct net P&L on Dashboard → switch theme persists → panic-lock returns to Unlock and requires passphrase.
- Every core module is written test-first; CI runs unit + E2E headless.

## 11. Build order (milestones within the slice)

1. Scaffold: electron-vite + TS + Tailwind tokens → blank pastel shell that launches with the secure renderer config.
2. Encrypted DB + keychain + passphrase unlock + panic-lock (+ tests).
3. Connector port + manual/CSV driver + `transactions` write/query.
4. Rate engine + `pnl:summary` + Dashboard render.
5. Chaturbate driver (fixture-first) + health monitor + Connectors screen.
6. Theme switcher + "what leaves your machine" inspector + Settings.
7. E2E green + first local (unsigned dev) build.

## 12. Definition of done (slice acceptance)

- App launches to Unlock; first run sets a passphrase; relaunch requires it.
- Connecting Chaturbate (mock) + importing a CSV yields transactions in the encrypted store; the DB file is unreadable without the key.
- Dashboard shows correct gross/cuts/net, per-platform breakdown with data-source tags, and active-fans count, all driven by editable dated rate rules.
- Theme switch works across all 3 palettes + dark, and persists.
- The network gateway refuses a non-allowlisted host (test-proven); the inspector accurately lists egress.
- Panic-lock zeroizes the key and returns to Unlock.
- Unit + E2E suites pass in CI.

## 13. Open questions / deferred decisions

- **Real Chaturbate token testing:** built fixture-first; live-token validation happens when the user wires a real account (not a CI dependency).
- **Argon2id parameters:** pick sane interactive defaults (e.g., memory/iterations) at implementation; tune later.
- **Signing/notarization:** deferred to the first real installer cut (blueprint addendum: Azure Trusted Signing + Apple Developer ID).
- **Active-fans definition:** distinct `payer_ref` within the period; refine when fan-CRM lands.


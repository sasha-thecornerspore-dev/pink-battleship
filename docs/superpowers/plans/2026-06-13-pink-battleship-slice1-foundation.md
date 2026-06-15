# Pink Battleship — Slice 1 "Foundation + honest P&L" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A launchable, soft-pastel Electron desktop app where a creator sets a passphrase, connects Chaturbate (mock) and imports a CSV, sees a correct unified gross→net P&L, switches theme, and inspects exactly what leaves their machine — all local, encrypted, no telemetry.

**Architecture:** Approach A — thin sandboxed React renderer, fat Electron main, plain-Node ports-and-adapters core. The renderer talks to main only through a typed `contextBridge` IPC API. All sensitive logic (crypto, DB, secrets, connectors, network) lives in main/core. The core is unit-tested headlessly against in-memory fakes (no native-module ABI pain in tests); the real SQLCipher DB and the GUI are validated by running the app.

**Tech Stack:** electron-vite · React 18 · TypeScript · Tailwind v4 (CSS-first `@theme`) · Radix primitives · better-sqlite3-multiple-ciphers (encrypted SQLite, prebuilt) · @node-rs/argon2 (key derivation, prebuilt napi) · Node `crypto` (AES-256-GCM) · Zustand · TanStack Query · electron-builder · Vitest · Playwright (Electron).

**Testability strategy:** `Database` is a narrow port. Core services are tested against an `InMemoryDatabase` fake in Vitest (runs in system Node, headless). The SQLCipher adapter and the GUI/IPC are validated by launching the app (the user's machine; this sandbox is headless). Native modules are loaded only in the Electron main process.

---

## File structure

```
pink-battleship/
  package.json, electron.vite.config.ts, tsconfig.json, tsconfig.node.json
  vitest.config.ts, playwright.config.ts, index.html
  src/
    shared/
      ipc.ts            IPC channel names + request/response types
      models.ts         domain types (Transaction, ConnectorInfo, RateRule, PnlSummary, ThemeId…)
    core/
      crypto/keyvault.ts            deriveKey (argon2id) + AES-256-GCM wrap/unwrap + zeroize
      secrets/secretStore.ts        port + safeStorageSecretStore.ts adapter
      db/database.ts                Database port
      db/inMemoryDatabase.ts        test/dev fake
      db/sqlcipherDatabase.ts       better-sqlite3-multiple-ciphers adapter
      db/migrations.ts              schema DDL (v1)
      connectors/port.ts            Connector interface + driver types + risk labels
      connectors/manualCsv.ts       CSV → Transaction[]
      connectors/chaturbate.ts      official driver (fixture-first) via NetworkGateway
      connectors/fixtures/chaturbate-events.json
      connectors/health.ts          health state machine
      pnl/rateEngine.ts             dated rate resolution + net math
      pnl/pnlService.ts             gross/net/per-platform/active-fans/daily series
      privacy/networkGateway.ts     egress allowlist + egress log
    main/index.ts                   app lifecycle + BrowserWindow (secure flags)
    main/services.ts                compose core singletons
    main/ipc.ts                     register IPC handlers → core
    preload/index.ts                typed contextBridge API
    renderer/main.tsx, App.tsx
    renderer/theme/themes.ts, theme.css, ThemeProvider.tsx
    renderer/store/ui.ts            zustand (route, locked, theme)
    renderer/lib/api.ts             window.pb wrappers + TanStack Query hooks
    renderer/screens/{Unlock,FirstRun,Dashboard,Connectors,Import,Settings}.tsx
    renderer/components/{Sidebar,TrustChip,MetricCard,RiskBadge}.tsx
  test/e2e/app.spec.ts              playwright-electron smoke
```

---

## Milestone 1 — Scaffold that launches a pastel shell

### Task 1.1: Project manifest + tooling config

**Files:** Create `package.json`, `electron.vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `vitest.config.ts`, `index.html`.

- [ ] **Step 1:** Write `package.json` with scripts (`dev`, `build`, `typecheck`, `test`, `test:e2e`) and deps listed in Tech Stack. `"main": "out/main/index.js"`, `"type": "module"`.
- [ ] **Step 2:** Write `electron.vite.config.ts` with `main`, `preload`, `renderer` sections; renderer uses `@vitejs/plugin-react` + `@tailwindcss/vite`. Externalize native deps (`better-sqlite3-multiple-ciphers`, `@node-rs/argon2`) from the main bundle.
- [ ] **Step 3:** Write `tsconfig*.json` (strict, `moduleResolution: "bundler"`, path alias `@shared/*` → `src/shared/*`, `@core/*` → `src/core/*`).
- [ ] **Step 4:** Write `vitest.config.ts` (environment `node`, include `src/core/**/*.test.ts`).
- [ ] **Step 5:** `npm install`. Expected: completes; native prebuilds fetched.
- [ ] **Step 6:** `npm run typecheck`. Expected: passes (no source yet besides configs → may be no-op).
- [ ] **Step 7:** Commit: `chore: scaffold electron-vite + typescript + vitest tooling`.

### Task 1.2: Secure main window + minimal renderer

**Files:** Create `src/main/index.ts`, `src/preload/index.ts`, `index.html`, `src/renderer/main.tsx`, `src/renderer/App.tsx`, `src/renderer/theme/theme.css`, `src/renderer/theme/themes.ts`.

- [ ] **Step 1:** `src/main/index.ts` — create `BrowserWindow` with `contextIsolation: true, nodeIntegration: false, sandbox: true`, load renderer. Quit on all-closed (non-mac).
- [ ] **Step 2:** `src/preload/index.ts` — expose a stub `window.pb = { ping: () => ipcRenderer.invoke('ping') }` via `contextBridge`.
- [ ] **Step 3:** `theme/themes.ts` — define the 3 palettes (Blush & mauve default, Lavender & pearl, Rose & sage) as token maps; `theme.css` defines CSS variables consumed by Tailwind `@theme`.
- [ ] **Step 4:** `App.tsx` — render the pastel app frame (sidebar + empty dashboard placeholder) using the default theme.
- [ ] **Step 5:** `npm run build`. Expected: main/preload/renderer all compile.
- [ ] **Step 6:** (User machine) `npm run dev` → a pastel window appears. In sandbox: build success is the gate.
- [ ] **Step 7:** Commit: `feat: secure electron shell with pastel theme scaffold`.

---

## Milestone 2 — Encrypted core: key vault, secrets, DB, unlock, panic-lock

### Task 2.1: Key vault (TDD)

**Files:** Create `src/core/crypto/keyvault.ts`, `src/core/crypto/keyvault.test.ts`.

- [ ] **Step 1: Write failing test** `keyvault.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateDbKey, deriveWrappingKey, wrapKey, unwrapKey, zeroize } from './keyvault'

describe('keyvault', () => {
  it('round-trips a wrapped DB key with the correct passphrase', async () => {
    const dbKey = generateDbKey()
    const salt = generateDbKey().subarray(0, 16)
    const wk = await deriveWrappingKey('correct horse', salt)
    const blob = wrapKey(dbKey, wk)
    const wk2 = await deriveWrappingKey('correct horse', salt)
    const out = unwrapKey(blob, wk2)
    expect(Buffer.compare(out, dbKey)).toBe(0)
  })
  it('fails to unwrap with the wrong passphrase', async () => {
    const dbKey = generateDbKey()
    const salt = generateDbKey().subarray(0, 16)
    const blob = wrapKey(dbKey, await deriveWrappingKey('right', salt))
    expect(() => unwrapKey(blob, undefined as any)).toThrow()
    const wrong = await deriveWrappingKey('wrong', salt)
    expect(() => unwrapKey(blob, wrong)).toThrow()
  })
  it('zeroize wipes the buffer', () => {
    const b = Buffer.from('secret-bytes-here')
    zeroize(b)
    expect(b.every((x) => x === 0)).toBe(true)
  })
})
```

- [ ] **Step 2:** Run `npm test -- keyvault` → FAIL (module not found).
- [ ] **Step 3: Implement** `keyvault.ts`:

```ts
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'
import { hash as argon2Hash, Algorithm } from '@node-rs/argon2'

export function generateDbKey(): Buffer { return randomBytes(32) }

export async function deriveWrappingKey(passphrase: string, salt: Buffer): Promise<Buffer> {
  const raw = await argon2Hash(passphrase, {
    algorithm: Algorithm.Argon2id, salt, memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32,
  })
  // argon2Hash returns an encoded string; derive 32 raw bytes deterministically from it
  return Buffer.from(raw).subarray(0, 32)
}

export interface WrappedKey { v: 1; iv: string; tag: string; ct: string; salt: string }

export function wrapKey(dbKey: Buffer, wrappingKey: Buffer, salt = randomBytes(16)): WrappedKey {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', wrappingKey, iv)
  const ct = Buffer.concat([c.update(dbKey), c.final()])
  return { v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64'), salt: salt.toString('base64') }
}

export function unwrapKey(blob: WrappedKey, wrappingKey: Buffer): Buffer {
  const d = createDecipheriv('aes-256-gcm', wrappingKey, Buffer.from(blob.iv, 'base64'))
  d.setAuthTag(Buffer.from(blob.tag, 'base64'))
  return Buffer.concat([d.update(Buffer.from(blob.ct, 'base64')), d.final()])
}

export function zeroize(b: Buffer): void { b.fill(0) }
```

> Note: `@node-rs/argon2` `hash()` returns an encoded string. For a stable 32-byte key, prefer the raw KDF: if available use `argon2.hashRaw`; otherwise derive via the encoded hash → `createHash('sha256')`. Adjust `deriveWrappingKey` at implementation to return a deterministic 32-byte Buffer and update the test accordingly. **Fallback if @node-rs/argon2 won't install/load:** use `crypto.scryptSync(passphrase, salt, 32, { N: 16384, r: 8, p: 1 })` (zero native deps) and note the swap.

- [ ] **Step 4:** Run `npm test -- keyvault` → PASS.
- [ ] **Step 5:** Commit: `feat(core): key vault with argon2id wrap + aes-256-gcm`.

### Task 2.2: Database port + in-memory fake + migrations + SQLCipher adapter

**Files:** Create `src/core/db/database.ts`, `inMemoryDatabase.ts`, `migrations.ts`, `sqlcipherDatabase.ts`, and `src/shared/models.ts`.

- [ ] **Step 1:** `models.ts` — define `Platform`, `ConnectorInfo` (`driver: 'official'|'manual'`, `riskLabel`, `status`), `TransactionKind = 'tip'|'sub'|'ppv'|'clip'|'other'`, `Transaction`, `RateRule` (`kind: 'platform_cut'|'processor_fee'`, `rate`, `fixedFee`, `effectiveFrom`, `effectiveTo|null`, `isEstimate`), `PnlSummary`, `EgressEntry`, `ThemeId`.
- [ ] **Step 2:** `database.ts` — `Database` port: `insertTransactions`, `queryTransactions(filter)`, `listRateRules(platformId?)`, `upsertRateRule`, `listConnectors`, `upsertConnector`, `getSetting/setSetting`, `appendEgress/listEgress`, `seedDefaults`.
- [ ] **Step 3:** `migrations.ts` — the v1 DDL (tables from spec §5): `platforms, connectors, transactions, rate_rules, settings, egress_log`.
- [ ] **Step 4:** `inMemoryDatabase.ts` — Map-backed implementation of `Database` (used by tests + as a `--demo` mode).
- [ ] **Step 5:** `sqlcipherDatabase.ts` — `better-sqlite3-multiple-ciphers` adapter: open file, `PRAGMA key`, run migrations, implement port. (Loaded only in main; not imported by Vitest.)
- [ ] **Step 6:** Quick test `inMemoryDatabase.test.ts`: insert 2 transactions, query back, upsert a rate rule, read settings. Run → PASS.
- [ ] **Step 7:** Commit: `feat(core): database port, in-memory fake, v1 migrations, sqlcipher adapter`.

### Task 2.3: Secret store + vault lifecycle in main

**Files:** Create `src/core/secrets/secretStore.ts`, `safeStorageSecretStore.ts`, `src/main/services.ts`; extend `src/shared/ipc.ts`.

- [ ] **Step 1:** `secretStore.ts` — port (`get/set/delete`); `safeStorageSecretStore.ts` — Electron `safeStorage` + a JSON file of ciphertext under `app.getPath('userData')`.
- [ ] **Step 2:** `services.ts` — compose `vault` lifecycle: `firstRunSetPassphrase`, `unlock(passphrase)`, `lock()` (zeroize key, close DB), `status()`. Stores `wrappedKey` blob + salt via secret store; opens `SqlcipherDatabase` on unlock.
- [ ] **Step 3:** `ipc.ts` (shared) — channels `vault:status|setup|unlock|lock`.
- [ ] **Step 4:** Wire handlers in `src/main/ipc.ts`; expose in preload as `window.pb.vault.*`.
- [ ] **Step 5:** `npm run build` → compiles. Commit: `feat: vault lifecycle (passphrase unlock, panic-lock) over IPC`.

### Task 2.4: Unlock + FirstRun screens

**Files:** Create `renderer/screens/Unlock.tsx`, `FirstRun.tsx`; `renderer/store/ui.ts`; `renderer/lib/api.ts`.

- [ ] **Step 1:** `ui.ts` (zustand) — `{ route, locked, theme }` + actions.
- [ ] **Step 2:** `api.ts` — typed wrappers over `window.pb` + TanStack Query hooks (`useVaultStatus`, `useUnlock`, …).
- [ ] **Step 3:** `Unlock.tsx` — passphrase form → `vault:unlock`; on success set `locked=false`. `FirstRun.tsx` — set passphrase + confirm.
- [ ] **Step 4:** `App.tsx` — route gate: if no passphrase set → FirstRun; if locked → Unlock; else main shell.
- [ ] **Step 5:** `npm run build` → compiles. Commit: `feat: unlock + first-run passphrase screens`.

---

## Milestone 3 — Connectors: port, manual CSV, transactions

### Task 3.1: Connector port + manual CSV driver (TDD)

**Files:** Create `src/core/connectors/port.ts`, `manualCsv.ts`, `manualCsv.test.ts`.

- [ ] **Step 1: Failing test** `manualCsv.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseCsvTransactions } from './manualCsv'

const csv = `date,amount,type,payer\n2026-05-01,12.50,tip,fan_a\n2026-05-02,5,ppv,fan_b\nbad,row\n`

describe('parseCsvTransactions', () => {
  it('maps valid rows to transactions and reports bad rows', () => {
    const r = parseCsvTransactions(csv, { platformId: 'onlyfans', map: { date: 'date', amount: 'amount', kind: 'type', payer: 'payer' } })
    expect(r.transactions).toHaveLength(2)
    expect(r.transactions[0]).toMatchObject({ platformId: 'onlyfans', grossAmount: 12.5, kind: 'tip', payerRef: 'fan_a' })
    expect(r.skipped).toHaveLength(1)
  })
})
```

- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement `port.ts` (`Connector` interface, `RiskLabel`, `DriverKind`) + `manualCsv.ts` (`parseCsvTransactions`, tolerant parser, returns `{transactions, skipped}`). **Step 4:** Run → PASS. **Step 5:** Commit `feat(core): connector port + tolerant CSV import driver`.

### Task 3.2: Chaturbate driver, fixture-first (TDD)

**Files:** Create `src/core/connectors/chaturbate.ts`, `chaturbate.test.ts`, `fixtures/chaturbate-events.json`, and `src/core/privacy/networkGateway.ts` (+ test).

- [ ] **Step 1:** `networkGateway.test.ts` — gateway allows an allowlisted host and **throws (fails closed)** on a non-allowlisted host; logs each attempt. Run → FAIL → implement `networkGateway.ts` (`request(host, fn)`, allowlist set, `onEgress` callback) → PASS.
- [ ] **Step 2:** `chaturbate.test.ts` — given the events fixture, the driver normalizes tip/token events into `Transaction[]` (gross, kind `tip`, `payerRef`, `occurredAt`, `externalId`) and exposes `riskLabel = 'official-low'` + `dataFlows = ['eventsapi.chaturbate.com']`. Run → FAIL.
- [ ] **Step 3:** Implement `chaturbate.ts` with a `mock: true` mode reading the fixture (no network), and a live mode that pulls via `NetworkGateway`. **Step 4:** Run → PASS. **Step 5:** Commit `feat(core): chaturbate driver (fixture-first) + fail-closed network gateway`.

### Task 3.3: Connector health monitor (TDD)

**Files:** Create `src/core/connectors/health.ts`, `health.test.ts`.

- [ ] **Step 1:** Test the state machine: fresh→`needs_sync`; successful sync→`healthy`; thrown sync→`broken` (and a `broken` official connector must not be auto-retried). Run → FAIL → implement → PASS. **Step 2:** Commit `feat(core): connector health state machine`.

---

## Milestone 4 — Rate engine, P&L, Dashboard

### Task 4.1: Rate engine (TDD)

**Files:** Create `src/core/pnl/rateEngine.ts`, `rateEngine.test.ts`.

- [ ] **Step 1: Failing test**:

```ts
import { describe, it, expect } from 'vitest'
import { netForTransaction } from './rateEngine'

const rules = [
  { id:'r1', platformId:'chaturbate', kind:'platform_cut', rate:0.5, fixedFee:0, effectiveFrom:'2026-01-01', effectiveTo:null, isEstimate:true },
  { id:'r2', platformId:'chaturbate', kind:'processor_fee', rate:0, fixedFee:0.0, effectiveFrom:'2026-01-01', effectiveTo:null, isEstimate:true },
] as const

describe('netForTransaction', () => {
  it('applies the dated platform cut', () => {
    const net = netForTransaction({ platformId:'chaturbate', grossAmount:100, occurredAt:'2026-05-01' } as any, rules as any)
    expect(net).toBe(50)
  })
  it('ignores rules outside the effective window', () => {
    const net = netForTransaction({ platformId:'chaturbate', grossAmount:100, occurredAt:'2025-06-01' } as any, rules as any)
    expect(net).toBe(100)
  })
})
```

- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement `netForTransaction` (sum matching `platform_cut` + `processor_fee` rules whose window covers `occurredAt`; `net = gross*(1-cutRate) - fees`). **Step 4:** Run → PASS. **Step 5:** Commit `feat(core): dated rate-rule net engine`.

### Task 4.2: P&L service (TDD)

**Files:** Create `src/core/pnl/pnlService.ts`, `pnlService.test.ts`.

- [ ] **Step 1:** Test against `InMemoryDatabase` seeded with transactions across 2 platforms + rules: `summary()` returns gross, fees, net, per-platform breakdown (with `dataSource` tag), `activeFans` (distinct payerRef), and a daily net series. Run → FAIL → implement → PASS. **Step 2:** Commit `feat(core): P&L summary service`.

### Task 4.3: Dashboard screen + IPC

**Files:** Extend `shared/ipc.ts` (`pnl:summary`, `transactions:query`), `main/ipc.ts`; create `renderer/screens/Dashboard.tsx`, `components/MetricCard.tsx`, `TrustChip.tsx`, `Sidebar.tsx`.

- [ ] **Step 1:** Wire `pnl:summary` IPC → `PnlService`. **Step 2:** Build the Dashboard from the approved mockup (net hero, gross/fees/net/active-fans metric cards, per-platform breakdown with data-source tags, 30-day net sparkline, connector-health line, "nothing leaves this device" chip). **Step 3:** `npm run build` → compiles. **Step 4:** Commit `feat: dashboard with unified gross→net P&L`.

---

## Milestone 5 — Connectors screen + CSV Import

### Task 5.1: Connectors screen

**Files:** Extend ipc (`connectors:list|connect|sync`); create `renderer/screens/Connectors.tsx`, `components/RiskBadge.tsx`.

- [ ] List connectors with status + risk badge; "Connect Chaturbate (mock)" runs a sync that ingests fixture transactions; manual platforms show "import CSV" CTA. Build → compiles. Commit `feat: connectors screen with risk labels + mock chaturbate sync`.

### Task 5.2: CSV Import screen

**Files:** Extend ipc (`import:csv`); create `renderer/screens/Import.tsx`.

- [ ] Upload CSV → column-mapping UI → preview → confirm → transactions persisted; bad rows surfaced. Build → compiles. Commit `feat: CSV import with column mapping`.

---

## Milestone 6 — Theming + "what leaves your machine" inspector + Settings

### Task 6.1: Theme switcher

**Files:** `renderer/theme/ThemeProvider.tsx`, extend Settings; persist via `settings:set`.

- [ ] Live-switch across the 3 palettes × light/dark; persists in `settings`. Build → compiles. Commit `feat: selectable pastel themes (blush/lavender/rose × light/dark)`.

### Task 6.2: Data-flow inspector + Settings

**Files:** Extend ipc (`privacy:dataFlows`, `rates:list|upsert`, `settings:get|set`); create `renderer/screens/Settings.tsx`.

- [ ] Settings: theme picker, rate-rule editor (dated, editable estimates), passphrase change, panic-lock button. Inspector lists each connector's declared `dataFlows` + the live `egress_log`. Build → compiles. Commit `feat: data-flow inspector + settings (rates, theme, panic-lock)`.

---

## Milestone 7 — E2E + dev build

### Task 7.1: Playwright-electron smoke (user machine)

**Files:** `playwright.config.ts`, `test/e2e/app.spec.ts`.

- [ ] E2E: first-run set passphrase → connect Chaturbate (mock) → import CSV → assert net P&L value → switch theme persists → panic-lock returns to Unlock. (Runs on a machine with a display.) Commit `test(e2e): slice-1 happy path`.

### Task 7.2: First dev build

- [ ] `npm run build` clean; `electron-builder --dir` produces an unpacked app. Commit `chore: verify unpacked dev build`.

---

## Definition of done (slice acceptance)
Maps 1:1 to spec §12: launch→unlock (passphrase required on relaunch); connect (mock) + CSV import → encrypted store; dashboard shows correct gross/fees/net + per-platform + active-fans from editable dated rules; theme switch persists across 3 palettes + dark; network gateway refuses non-allowlisted host (test-proven); panic-lock zeroizes key → Unlock; unit suite green (E2E green on a display-capable machine).

## Notes for the executor
- **Headless sandbox:** the GUI cannot open here; gates are `npm install`, `npm run typecheck`, `npm test` (Vitest core), and `npm run build`. GUI launch + Playwright E2E run on the user's machine.
- **Native modules in Electron:** `better-sqlite3-multiple-ciphers` must match Electron's ABI — run `electron-builder install-app-deps` (or `@electron/rebuild`) before launching the packaged app. Vitest never imports the native adapter (uses `InMemoryDatabase`), so the test suite is ABI-independent.
- **Argon2 fallback:** if `@node-rs/argon2` won't install/load, swap `deriveWrappingKey` to `crypto.scryptSync` and note it in the commit.

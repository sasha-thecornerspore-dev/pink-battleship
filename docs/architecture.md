# Architecture

Pink Battleship is a local-first Electron desktop app. Everything runs on the creator's machine; the only deliberate future exception is a thin hosted component for payment webhooks (not in this build).

## Process model (thin renderer / fat main)

- **Main process (Node)** — owns the encrypted SQLite store, the OS keychain, all connectors, the AI router, and the single outbound network gateway. Every external request funnels through the gateway and is checked against a per-connector allowlist (fails closed).
- **Preload** — exposes a typed, allowlisted `contextBridge` API on `window.pb`. `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. No raw `ipcRenderer`, no Node in the renderer.
- **Renderer (React)** — the pastel UI. Reads and writes only through the IPC API; never touches secrets, the database, or the network directly.

## Ports & adapters core (`src/core`)

All domain logic is plain Node, unit-tested without Electron. The Electron app and the in-browser demo backend both drive the same core.

| Module | Responsibility |
|---|---|
| `crypto/keyvault` | scrypt key derivation + AES-256-GCM wrap/unwrap; zeroize |
| `db/` | `Database` port + `InMemoryDatabase` (tests/demo) + `SqlcipherDatabase` (app) + v1 migrations |
| `secrets/` | `SecretStore` port + `SafeStorageSecretStore` (OS keychain) |
| `connectors/` | `Connector` port; Chaturbate driver (mock + live Events API); manual CSV; fail-closed `NetworkGateway`; health state machine |
| `pnl/` | dated rate-rule engine + P&L summary |
| `fans/` | rolodex aggregation + spender tiers |
| `stats/` | net time-series (moving average) + day×hour earnings heatmap |
| `gallery/` | metadata-first DAM (master gallery + sets, tags, posted-status) |
| `assistant/` | safety screen (hard blocks + PII + creator boundaries) + provider router + template drafter |
| `schedule/` | content-calendar items |
| `compliance/` | 2257 records + custodian statement + tax set-aside + DMCA generator |

## Boundary (`src/shared`)

- `models.ts` — domain types shared across processes.
- `ipc.ts` — `PbApiContract` (the full `window.pb` surface) + channel constants.

## Main wiring (`src/main`)

- `services.ts` — the single composition root (`AppServices`): vault lifecycle (setup / unlock / panic-lock) plus one method per IPC operation.
- `ipc.ts` — registers `ipcMain.handle` for every channel.
- `index.ts` — secure `BrowserWindow`, IPC registration, auto-update init.
- `updater.ts` — electron-updater (packaged builds only; no-op in dev).

## Renderer (`src/renderer`)

- `App.tsx` — vault-status gate → FirstRun / Unlock / Shell.
- `Shell.tsx` + `components/Sidebar.tsx` — navigation + routed screens.
- `lib/api.ts` — `window.pb ?? createDemoBackend()` and TanStack Query hooks.
- `lib/demoBackend.ts` — runs the real core over an in-memory DB for `npm run prototype`.
- `theme/` — three pastel palettes × light/dark via CSS variables.
- `screens/` — one file per section (Dashboard, Stats, Fans, Galleries, Assistant, Calendar, Connectors, Import, Compliance, Settings).

## Security

- Database encrypted at rest (SQLCipher); the DB key is wrapped by a passphrase-derived key (scrypt) and protected by the OS keychain.
- No telemetry — the network gateway refuses any non-allowlisted host, and the "what leaves your machine" inspector surfaces every declared egress.
- Panic-lock zeroizes the in-memory key and returns to the lock screen.

## Commands

| Command | What it does |
|---|---|
| `npm test` | Vitest unit suite over `src/core` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | electron-vite production build (main + preload + renderer) |
| `npm run dev` | launch the Electron app (after `npm run rebuild`) |
| `npm run rebuild` | build the native DB module against Electron's ABI |
| `npm run prototype` | serve the renderer with the in-memory demo backend |
| `npm run test:e2e` | Playwright-Electron happy path (needs a display) |
| `npm run dist` | build signed installers (see [distribution](distribution.md)) |

## Release

Tag `v*` and push → GitHub Actions builds, signs, and publishes Windows + macOS installers to GitHub Releases, which also serves the electron-updater feed. See [distribution.md](distribution.md).

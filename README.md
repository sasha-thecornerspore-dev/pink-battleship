# Pink Battleship 🩷

A local-first desktop business cockpit for independent, multi-platform content creators.

Pink Battleship brings your platforms, earnings, fans, and content into one private app that runs on **your** machine. Credentials, finances, and content stay local by design — there is no telemetry and no cloud account.

> **Status:** active development. Windows & macOS desktop app (Electron).

## Highlights

- **Unified net P&L** across Chaturbate, OnlyFans, Fansly, ManyVids — gross → cuts → net, with configurable dated rate estimates.
- **Fan rolodex** — every spender ranked by net, with whale / VIP tiers and private, on-device notes.
- **Stats** — a net-earnings time-series with a 7-day moving average, and a day×hour "best time to earn" heatmap keyed on real dollars (not viewer guesses).
- **Connectors** — official APIs where they exist (Chaturbate), manual CSV import where they don't (no automation, no ban risk).
- **Local-first & private** — encrypted SQLite vault (passphrase + OS keychain), a fail-closed network gateway, a "what leaves your machine" inspector, and a panic-lock.
- **Soft pastel UI** — three selectable themes × light/dark.

![Dashboard](docs/images/dashboard.png)
![Stats](docs/images/stats.png)

## Try the prototype (no install of the desktop app)

Click through the whole app in your browser — the real core logic, in-memory, no Electron:

```bash
npm install
npm run prototype
```

## Run the desktop app

```bash
npm install
npm run rebuild   # build the native encrypted-DB module against Electron's ABI
npm run dev
```

## Develop

```bash
npm test          # unit suite (Vitest)
npm run typecheck
npm run build     # production build (main + preload + renderer)
npm run test:e2e  # Playwright happy-path (needs a display)
```

## Docs

- [Getting started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [Distribution & release pipeline](docs/distribution.md)
- [Product blueprint](docs/Pink-Battleship-Blueprint.md)

## Tech

Electron · React · TypeScript · Tailwind · SQLite (SQLCipher) · Vitest · electron-builder. Distributed as signed Windows/macOS installers from GitHub Releases. Not affiliated with any third-party platform.

## License

Proprietary — Copyright © 2026 Corner Spore. All rights reserved. See [LICENSE](LICENSE).

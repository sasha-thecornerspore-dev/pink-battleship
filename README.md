# Pink Battleship

A local-first desktop business cockpit for independent, multi-platform content creators.

Pink Battleship unifies a creator's platforms, earnings, content library, schedule, and assistant tooling into a single private application that runs on the creator's own machine. Credentials, financial data, and content stay local by design.

> **Status:** early development. The product blueprint lives in [`docs/Pink-Battleship-Blueprint.md`](docs/Pink-Battleship-Blueprint.md); design specs live in [`docs/superpowers/specs/`](docs/superpowers/specs/).

## Platforms

Distributed as signed desktop installers for **Windows** and **macOS**. Not affiliated with any third-party platform.

## Principles

- **Local-first** — your data lives on your device, not in our cloud.
- **No telemetry** — the application ships with no analytics endpoints; outbound network access is allowlisted and inspectable.
- **Compliance-aware and trust-first** — security and privacy are treated as product features, not afterthoughts.

## Development

Scaffolding in progress. Tech stack: Electron + React + TypeScript (electron-vite), encrypted local store (SQLite + SQLCipher), packaged with electron-builder.

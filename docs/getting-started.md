# Getting started

## Install & run

1. `npm install`
2. `npm run rebuild` — builds the encrypted-database native module against Electron's ABI (one time, and again after an Electron upgrade).
3. `npm run dev` — launches the app.

On first run you set a **passphrase**. It encrypts your local vault, is never sent anywhere, and **cannot be recovered if lost**.

## First steps

- **Connectors** → *Connect Chaturbate (demo)* to pull sample official-API data, or open **Import** for a CSV.
- **Import** → pick a platform, paste or upload a CSV, and map the date / amount / type / payer columns. Hit *Use sample* to try it instantly.
- **Dashboard** → your unified gross → net P&L.
- **Stats** → earnings over time and your best earning hours.
- **Fans** → spenders ranked by net, with private notes.
- **Settings** → switch themes, edit platform rate estimates, review "what leaves your machine", or panic-lock the vault.

## Privacy

Everything is local. The only outbound destination in this build is the official Chaturbate API host, and only once you connect it — visible any time under **Settings → What leaves your machine**.

## Just looking?

`npm run prototype` opens a browser demo (in-memory, no Electron) seeded with sample data, so you can click the whole app without setup.

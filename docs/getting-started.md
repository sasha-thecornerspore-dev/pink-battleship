# Getting started

## Install & run

1. `npm install`
2. `npm run rebuild` — builds the native modules (encrypted database + the optional `sharp` image library for gallery thumbnails) against Electron's ABI. Run once, and again after an Electron upgrade.
3. `npm run dev` — launches the app.

> Gallery thumbnails and dimension/duration read-out use `sharp` (images) and `ffmpeg`/`ffprobe` (video). These are **optional** — if they're missing, file import still works (referenced in place), just without thumbnails.

On first run you set a **passphrase**. It encrypts your local vault, is never sent anywhere, and **cannot be recovered if lost**.

## First steps

- **Connectors** → *Connect Chaturbate (demo)* to pull sample official-API data, or open **Import** for a CSV.
- **Import** → pick a platform, paste or upload a CSV, and map the date / amount / type / payer columns. Hit *Use sample* to try it instantly.
- **Galleries** → *Import files…* to add photos/videos. Files are **referenced in place** — the app never copies your originals — and thumbnails + dimensions are read on import.
- **Live (OBS)** → connect OBS Studio's WebSocket (Tools → WebSocket Server Settings) to see your stream status without alt-tabbing.
- **Website** → build a link-in-bio page with an 18+ age gate, preview it live, and export the HTML.
- **Dashboard** → your unified gross → net P&L (and a live banner when you're streaming).
- **Stats** → earnings over time and your best earning hours.
- **Fans** → spenders ranked by net, with private notes.
- **Settings** → switch themes, edit platform rate estimates, review "what leaves your machine", or panic-lock the vault.

## Privacy

Everything is local. The only outbound destination in this build is the official Chaturbate API host, and only once you connect it — visible any time under **Settings → What leaves your machine**.

## Just looking?

`npm run prototype` opens a browser demo (in-memory, no Electron) seeded with sample data, so you can click the whole app without setup.

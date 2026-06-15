# Distribution & release pipeline

Pink Battleship ships as signed Windows + macOS installers published to GitHub Releases, with silent auto-update via `electron-updater`.

## One-time setup

1. Create the GitHub repo (**private** recommended for the source) and update `repository` in `package.json` and `appId` in `electron-builder.yml`.
2. Add the signing secrets (below) to the repo's Actions secrets.

## Releasing

```bash
npm version patch     # bumps package.json + creates a git tag
git push --follow-tags
```

The **Release** workflow (`.github/workflows/release.yml`) builds on `windows-latest` + `macos-latest`, signs/notarizes, and publishes installers plus the update feed. **CI** (`.github/workflows/ci.yml`) runs typecheck + tests + build on every push/PR.

## Code signing (read before buying anything)

- **Windows:** EV certs no longer grant instant SmartScreen reputation (since Mar 2024). Use **Azure Trusted Signing** (~$120/yr, no hardware token, CI-friendly). Self-signed certs are blocked by Smart App Control and break silent updates — do not use them for public builds. Secrets: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_CODE_SIGNING_ACCOUNT_NAME`, `AZURE_CERT_PROFILE_NAME` (and configure `win.azureSignOptions` in `electron-builder.yml`).
- **macOS:** Apple Developer Program ($99/yr) → Developer ID Application cert → hardened runtime + **notarization** (notarytool). Without it, Gatekeeper blocks the app and silent updates fail. Secrets: `CSC_LINK` (base64 `.p12`), `CSC_KEY_PASSWORD`, `APPLE_API_KEY` / `APPLE_API_KEY_ID` / `APPLE_API_ISSUER`.

Realistic recurring cost ≈ **$220/yr**. App stores ban explicit-content apps, so distribution is desktop installers from GitHub — not the Microsoft Store or Mac App Store.

## Auto-update

`src/main/updater.ts` calls `checkForUpdatesAndNotify()` on launch (packaged builds only). It reads the GitHub Releases feed; silent updates require valid signatures on both OSes — which is exactly why the signing steps above are load-bearing.

> ⚠️ Re-verify signing/notarization specifics and pricing at setup time — they change fast.

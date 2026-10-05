# Distribution & release pipeline

Pink Battleship ships as Windows and macOS installers on GitHub Releases. The app updates itself from the same feed via `electron-updater`, and the user chooses **Automatic** or **On demand** under *Settings → Updates*.

## What a release contains

| System | File | Auto-update |
|---|---|---|
| Windows 10/11 x64 | `PinkBattleship-Setup-<v>.exe` (NSIS installer) | ✅ |
| Windows x64, portable | `PinkBattleship-Portable-<v>.exe` | ❌ links to the releases page |
| macOS Apple Silicon | `PinkBattleship-<v>-mac-arm64.dmg` (+ `.zip` for the updater) | ✅ when signed |
| macOS Intel | `PinkBattleship-<v>-mac-x64.dmg` (+ `.zip` for the updater) | ✅ when signed |

Plus the update feeds `latest.yml` (Windows) and `latest-mac.yml` (both Mac arches, merged by `scripts/merge-mac-feed.mjs`), and `.blockmap` files for differential downloads.

## Releasing

```bash
npm version patch     # bumps package.json + creates the v<x.y.z> tag
git push --follow-tags
```

`.github/workflows/release.yml` then:

1. Builds on `windows-latest`, `macos-latest` (arm64) and `macos-15-intel` (x64). Each runner builds its own arch so the native modules (SQLCipher, sharp, ffmpeg) match. The job fails if the tag doesn't match `package.json`.
2. Signs each build when the secrets below exist. Without them it still builds: Windows comes out unsigned and macOS ad-hoc signed.
3. Merges the two Mac feeds, uploads everything to a **draft** release, then publishes it. Clients never see a half-uploaded feed.

`.github/workflows/ci.yml` runs typecheck, tests and build on every push and PR.

## Where releases are published (important)

Every build has the feed location baked in (`app-update.yml`), and installed apps fetch it **anonymously**. The release repo must therefore be **public**. If the source repo is private, either:

- **Make the source repo public**, or
- **Publish to a separate public repo** (e.g. `pink-battleship-releases`, holding only a README):
  1. Create the repo with at least one commit.
  2. Create a fine-grained PAT with *Contents: read & write* on that repo, and save it as the `RELEASE_TOKEN` secret in the source repo.
  3. Set the repo variable `RELEASE_REPO` to `owner/pink-battleship-releases`.
  4. Point `publish.owner`/`publish.repo` in `electron-builder.yml` and `src/shared/release.ts` at it.

Never ship a GitHub token inside the app so it can read a private repo. Anyone could extract it.

## Update modes (in the app)

- **Automatic** (default): checks ~15 s after launch and every 6 h, downloads in the background, installs on quit. A toast offers *Restart now*.
- **On demand**: makes no update traffic until the user clicks *Check for updates*. It then asks before downloading and offers *Restart & install*.

The choice is stored in `update-prefs.json` in the user-data folder, outside the encrypted vault, because the updater runs before unlock. Each check is recorded in the "What leaves your machine" log while the vault is unlocked. Dev builds and the portable exe report that they can't self-update and link to the releases page.

Logic: `src/core/updates/updateController.ts` (unit-tested). Electron wiring: `src/main/updater.ts`.

## Code signing (read before buying anything)

Updates install silently only on signed builds. The pipeline works without signing; these secrets upgrade it.

- **Windows: Azure Trusted Signing** (~$120/yr, no hardware token, CI-friendly). EV certs no longer give instant SmartScreen reputation (since Mar 2024). Self-signed certs get blocked by Smart App Control.
  - Secrets: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_CODE_SIGNING_ACCOUNT_NAME`, `AZURE_CERT_PROFILE_NAME`
  - Variables: `AZURE_ENDPOINT` (e.g. `https://eus.codesigning.azure.net`), `AZURE_PUBLISHER_NAME` (must match the certificate subject CN)
  - Unsigned Windows builds still auto-update. Users just click through SmartScreen on first install.
- **macOS: Apple Developer Program** ($99/yr) → Developer ID Application cert → hardened runtime + notarization.
  - Secrets: `CSC_LINK` (base64 `.p12`), `CSC_KEY_PASSWORD`, `APPLE_API_KEY` (*contents* of the `.p8`), `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`
  - Ad-hoc-signed builds open via *System Settings → Privacy & Security → Open Anyway*, but Squirrel.Mac won't apply updates to them. The app shows the update and links to the download instead.

Realistic recurring cost ≈ **$220/yr**. App stores ban explicit-content apps, so distribution is desktop installers from GitHub, not the Microsoft Store or Mac App Store.

> ⚠️ Re-verify signing/notarization specifics and pricing at setup time. They change fast.

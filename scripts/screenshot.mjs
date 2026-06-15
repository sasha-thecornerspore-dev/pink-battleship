// Dev helper: render the built renderer (out/renderer) with a mocked window.pb
// and capture screenshots. Run: npm run build, then `node scripts/screenshot.mjs`.
import http from 'node:http'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const here = fileURLToPath(import.meta.url)
const repo = join(dirname(here), '..')
const root = join(repo, 'out', 'renderer')
const outDir = join(repo, 'verify-shots')
mkdirSync(outDir, { recursive: true })

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.map': 'application/json',
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0])
  if (p === '/') p = '/index.html'
  const file = join(root, p)
  if (!existsSync(file)) {
    res.statusCode = 404
    res.end('not found')
    return
  }
  res.setHeader('Content-Type', MIME[extname(file)] || 'application/octet-stream')
  res.end(readFileSync(file))
})

await new Promise((r) => server.listen(0, r))
const port = server.address().port
const url = `http://localhost:${port}/`

const data = {
  connectors: [
    { id: 'chaturbate-mock', platformId: 'chaturbate', driver: 'official', riskLabel: 'official-low', status: 'healthy', lastSyncAt: '2026-05-02T00:00:00Z' },
    { id: 'manual:onlyfans', platformId: 'onlyfans', driver: 'manual', riskLabel: 'manual-none', status: 'healthy', lastSyncAt: '2026-05-02T00:00:00Z' },
  ],
  pnl: {
    gross: 12180, fees: 3760, net: 8420, activeFans: 643,
    byPlatform: [
      { platformId: 'chaturbate', driver: 'official', gross: 7820, net: 3910 },
      { platformId: 'onlyfans', driver: 'manual', gross: 3300, net: 2640 },
      { platformId: 'fansly', driver: 'manual', gross: 1475, net: 1180 },
      { platformId: 'manyvids', driver: 'manual', gross: 862, net: 690 },
    ],
    dailyNet: [
      { date: '2026-05-22', net: 180 }, { date: '2026-05-23', net: 240 }, { date: '2026-05-24', net: 210 },
      { date: '2026-05-25', net: 320 }, { date: '2026-05-26', net: 280 }, { date: '2026-05-27', net: 400 },
      { date: '2026-05-28', net: 360 }, { date: '2026-05-29', net: 520 }, { date: '2026-05-30', net: 610 },
    ],
  },
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1180, height: 760 }, deviceScaleFactor: 2 })

const unlocked = `(${makeMock.toString()})('unlocked', ${JSON.stringify(data)})`
const firstrun = `(${makeMock.toString()})('uninitialized', ${JSON.stringify(data)})`

function makeMock(status, d) {
  const r = (v) => () => Promise.resolve(v)
  window.pb = {
    vault: { status: r(status), setup: r('unlocked'), unlock: r({ ok: true }), lock: r(undefined) },
    connectors: { list: r(d.connectors), connectChaturbateMock: r(d.connectors[0]), sync: r({ inserted: 3 }) },
    imports: { csv: r({ inserted: 0, skipped: [] }) },
    pnl: { summary: r(d.pnl) },
    rates: { list: r([]), upsert: r(undefined) },
    settings: { getTheme: r({ theme: 'blush', mode: 'light' }), setTheme: r(undefined) },
    privacy: { dataFlows: r({ declared: [], log: [] }) },
  }
}

const dash = await ctx.newPage()
await dash.addInitScript(unlocked)
await dash.goto(url)
await dash.waitForSelector('text=Net earnings this period', { timeout: 10000 })
await dash.screenshot({ path: join(outDir, 'dashboard.png') })

const fr = await ctx.newPage()
await fr.addInitScript(firstrun)
await fr.goto(url)
await fr.waitForSelector('text=set your passphrase', { timeout: 10000 })
await fr.screenshot({ path: join(outDir, 'firstrun.png') })

await browser.close()
server.close()
console.log('Wrote screenshots to', outDir)

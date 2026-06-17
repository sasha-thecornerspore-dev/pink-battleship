// Dev helper: drive the built renderer (out/renderer) through its in-memory demo
// backend in headless Chromium and capture screenshots of the real flow.
// Run: npm run build, then `node scripts/screenshot.mjs`.
import http from 'node:http'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
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
const url = `http://localhost:${server.address().port}/`

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1180, height: 760 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()

await page.goto(url)
await page.getByText(/set your passphrase/i).waitFor({ timeout: 10000 })
await page.screenshot({ path: join(outDir, 'firstrun.png') })

await page.getByPlaceholder('Passphrase (min 8 characters)').fill('demo-passphrase')
await page.getByPlaceholder('Confirm passphrase').fill('demo-passphrase')
await page.getByRole('button', { name: /create encrypted vault/i }).click()

await page.getByText(/net earnings this period/i).waitFor({ timeout: 10000 })
await page.screenshot({ path: join(outDir, 'dashboard.png') })

await page.getByRole('button', { name: 'Take a tour' }).click()
await page.getByText('1 / 10').waitFor({ timeout: 5000 })
await page.screenshot({ path: join(outDir, 'tour.png') })
await page.getByRole('button', { name: 'Skip' }).click()

await page.getByRole('button', { name: 'Fans' }).click()
await page.getByText(/ranked by net/i).waitFor({ timeout: 5000 })
await page.screenshot({ path: join(outDir, 'fans.png') })

await page.getByRole('button', { name: 'Stats' }).click()
await page.getByText(/best time to earn/i).waitFor({ timeout: 5000 })
await page.screenshot({ path: join(outDir, 'stats.png') })

await page.getByRole('button', { name: 'Galleries' }).click()
await page.getByText(/Master gallery/i).waitFor({ timeout: 5000 })
await page.screenshot({ path: join(outDir, 'galleries.png') })

await page.getByRole('button', { name: 'Assistant' }).click()
await page.getByPlaceholder(/what's this about/i).fill('new blue lingerie set, Friday drop')
await page.getByRole('button', { name: 'Draft' }).click()
await page.getByText(/Routed via/i).waitFor({ timeout: 5000 })
await page.screenshot({ path: join(outDir, 'assistant.png') })

await page.getByRole('button', { name: 'Calendar' }).click()
await page.getByText(/Plan posts/i).waitFor({ timeout: 5000 })
await page.screenshot({ path: join(outDir, 'calendar.png') })

await page.getByRole('button', { name: 'Compliance' }).click()
await page.getByText('2257 records vault').waitFor({ timeout: 5000 })
await page.screenshot({ path: join(outDir, 'compliance.png') })

await page.getByPlaceholder(/2257 custodian/i).fill('Do I need a 2257 custodian if I only repost others content?')
await page.getByRole('button', { name: 'Ask' }).click()
await page.getByText(/Routed via/i).waitFor({ timeout: 5000 })
await page.getByText('Legal assistant').scrollIntoViewIfNeeded()
await page.screenshot({ path: join(outDir, 'legal.png') })

await page.getByRole('button', { name: 'Import' }).click()
await page.getByRole('button', { name: /use sample/i }).click()
await page.getByText(/columns detected/i).waitFor({ timeout: 5000 })
await page.screenshot({ path: join(outDir, 'import.png') })

await page.getByRole('button', { name: 'Connectors' }).click()
await page.getByText('Account safety').waitFor({ timeout: 5000 })
await page.screenshot({ path: join(outDir, 'connectors.png') })

await page.getByRole('button', { name: 'Settings' }).click()
await page.getByText('AI providers — free vs paid').waitFor({ timeout: 5000 })
await page.getByText('AI providers — free vs paid').scrollIntoViewIfNeeded()
await page.screenshot({ path: join(outDir, 'settings-ai.png') })

await page.getByRole('button', { name: 'Settings' }).click()
await page.getByRole('button', { name: 'dark' }).click()
await page.getByRole('button', { name: 'Dashboard' }).click()
await page.getByText(/net earnings this period/i).waitFor({ timeout: 5000 })
await page.screenshot({ path: join(outDir, 'dashboard-dark.png') })

await browser.close()
server.close()
console.log('Wrote screenshots to', outDir)

import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'

// Slice-1 happy path. Requires a real display + the native DB module built
// against Electron's ABI. On the dev machine:
//   npm run build && npm run rebuild && npm run test:e2e
// (This does not run in a headless CI sandbox.)

let app: ElectronApplication
let page: Page

test.beforeAll(async () => {
  app = await electron.launch({ args: ['.'] })
  page = await app.firstWindow()
})

test.afterAll(async () => {
  await app.close()
})

test('first run → connect → import → P&L → theme → panic-lock', async () => {
  // First run: set a passphrase and create the encrypted vault.
  await page.getByPlaceholder('Passphrase (min 8 characters)').fill('battleship-pink-2026')
  await page.getByPlaceholder('Confirm passphrase').fill('battleship-pink-2026')
  await page.getByRole('button', { name: /create encrypted vault/i }).click()

  // Connect Chaturbate (demo) — pulls fixture transactions.
  await page.getByRole('button', { name: 'Connectors' }).click()
  await page.getByRole('button', { name: /connect \(demo\)/i }).click()

  // Dashboard shows the net-led P&L.
  await page.getByRole('button', { name: 'Dashboard' }).click()
  await expect(page.getByText(/net earnings this period/i)).toBeVisible()

  // Import a CSV via the built-in sample.
  await page.getByRole('button', { name: 'Import' }).click()
  await page.getByRole('button', { name: /use sample/i }).click()
  await page.getByRole('button', { name: /^Import$/ }).click()
  await expect(page.getByText(/imported \d+ transactions/i)).toBeVisible()

  // Switch theme to dark, then panic-lock back to the unlock screen.
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'dark' }).click()
  await page.getByRole('button', { name: /panic-lock vault now/i }).click()
  await expect(page.getByText(/welcome back/i)).toBeVisible()
})

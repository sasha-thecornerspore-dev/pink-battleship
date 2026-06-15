// Serve the built renderer (out/renderer) as a clickable browser prototype.
// The renderer auto-detects the missing Electron bridge and uses the in-memory
// demo backend. Run: npm run prototype  (builds first, then serves + opens).
import http from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exec } from 'node:child_process'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const root = join(repo, 'out', 'renderer')
if (!existsSync(join(root, 'index.html'))) {
  console.error('No build found. Run `npm run build` first.')
  process.exit(1)
}

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

const PORT = 4317
server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/`
  console.log('\n  Pink Battleship prototype →', url)
  console.log('  (demo mode: in-memory, no Electron. Set any passphrase to enter.)\n')
  const opener =
    process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`
  exec(opener)
})

import { protocol } from 'electron'
import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

/**
 * Serves generated gallery thumbnails to the sandboxed renderer via a custom
 * pbthumb:// scheme. Only files whose name is a 40-hex-char sha1 + .jpg (exactly
 * what the probe writes) are served, and only from the thumb directory — so a
 * crafted URL can never read arbitrary files off the creator's disk.
 */

const THUMB_NAME = /^[a-f0-9]{40}\.jpg$/

/** Must run BEFORE app is ready (top-level of the main entry). */
export function registerThumbScheme(): void {
  protocol.registerSchemesAsPrivileged([{ scheme: 'pbthumb', privileges: { standard: true, secure: true, supportFetchAPI: true } }])
}

/** Must run AFTER app is ready. */
export function handleThumbProtocol(thumbDir: string): void {
  protocol.handle('pbthumb', async (request) => {
    let name = ''
    try {
      name = basename(new URL(request.url).host || '')
    } catch {
      return new Response('bad request', { status: 400 })
    }
    if (!THUMB_NAME.test(name)) return new Response('not found', { status: 404 })
    try {
      const buf = await readFile(join(thumbDir, name))
      return new Response(buf, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'no-cache' } })
    } catch {
      return new Response('not found', { status: 404 })
    }
  })
}

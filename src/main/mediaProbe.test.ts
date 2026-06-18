import { describe, it, expect } from 'vitest'
import { mkdtempSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNodeMediaProbe } from './mediaProbe'

// Exercises the REAL adapter against sharp when it's installed (it's an optional
// dep). Skips cleanly otherwise, so CI without the native libs still passes —
// matching the app's own graceful degradation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sharp: any = null
try {
  const mod: any = await import('sharp')
  sharp = mod.default ?? mod
} catch {
  sharp = null
}
const withSharp = sharp ? it : it.skip

describe('createNodeMediaProbe (real sharp)', () => {
  // Native libvips init can be slow on a cold worker, so allow generous time.
  withSharp(
    'reads image dimensions and writes a hashed thumbnail',
    async () => {
      const dir = mkdtempSync(join(tmpdir(), 'pb-thumb-'))
      try {
        const img = join(dir, 'red.png')
        await sharp!({ create: { width: 120, height: 80, channels: 3, background: { r: 200, g: 40, b: 90 } } })
          .png()
          .toFile(img)

        const meta = await createNodeMediaProbe(dir).probe(img)
        expect(meta.width).toBe(120)
        expect(meta.height).toBe(80)
        expect(meta.thumb).toMatch(/^pbthumb:\/\/[a-f0-9]{40}\.jpg$/)
        expect(existsSync(join(dir, meta.thumb!.replace('pbthumb://', '')))).toBe(true)
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    },
    30_000,
  )

  withSharp(
    'degrades to {} for an unreadable file (never throws)',
    async () => {
      const dir = mkdtempSync(join(tmpdir(), 'pb-thumb-'))
      try {
        const meta = await createNodeMediaProbe(dir).probe(join(dir, 'does-not-exist.jpg'))
        expect(meta).toEqual({})
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    },
    30_000,
  )
})

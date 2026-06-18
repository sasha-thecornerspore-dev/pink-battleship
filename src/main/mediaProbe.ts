import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import type { MediaMeta, MediaProbe } from '@core/gallery/mediaImport'
import { kindFromPath } from '@core/gallery/mediaImport'

const run = promisify(execFile)

/** Minimal shape of the bits of sharp we use (the dep is optional, so we don't import its types). */
interface SharpLike {
  metadata(): Promise<{ width?: number; height?: number }>
  rotate(): SharpLike
  resize(w: number, h: number, opts: { fit: string }): SharpLike
  jpeg(opts: { quality: number }): SharpLike
  toFile(path: string): Promise<unknown>
}

/**
 * Real media probe for the main process. Images use sharp (dimensions + a small
 * JPEG thumbnail); videos use ffprobe (duration + dimensions) and ffmpeg (a
 * single-frame thumbnail). All three are OPTIONAL native deps loaded lazily —
 * if any is missing or fails, we degrade to "no thumbnail / no dimensions"
 * rather than throwing, so import always works.
 *
 * Thumbnails are written to thumbDir and addressed by the pbthumb:// protocol
 * registered in the main entry; the filename is a stable hash of the source path
 * so re-importing the same file reuses its thumbnail.
 */
export function createNodeMediaProbe(thumbDir: string): MediaProbe {
  const thumbName = (path: string) => `${createHash('sha1').update(path).digest('hex')}.jpg`

  async function probeImage(path: string): Promise<MediaMeta> {
    try {
      // Loaded via a variable so neither the bundler nor tsc tries to resolve the
      // optional native dep at build time — only at runtime, if installed.
      const mod = 'sharp'
      const sharp = ((await import(/* @vite-ignore */ mod)) as { default: (p: string) => SharpLike }).default
      const out = join(thumbDir, thumbName(path))
      const meta: MediaMeta = {}
      const info = await sharp(path).metadata()
      if (info.width && info.height) {
        meta.width = info.width
        meta.height = info.height
      }
      try {
        if (!existsSync(out)) await sharp(path).rotate().resize(360, 360, { fit: 'inside' }).jpeg({ quality: 70 }).toFile(out)
        meta.thumb = `pbthumb://${thumbName(path)}`
      } catch {
        /* thumbnail optional */
      }
      return meta
    } catch {
      return {}
    }
  }

  async function ffBinary(mod: string, pick: (m: unknown) => string | undefined): Promise<string | null> {
    try {
      const m = await import(/* @vite-ignore */ mod)
      const p = pick(m) ?? pick((m as { default?: unknown }).default)
      return p && existsSync(p) ? p : null
    } catch {
      return null
    }
  }

  async function probeVideo(path: string): Promise<MediaMeta> {
    const meta: MediaMeta = {}
    const ffprobe = await ffBinary('ffprobe-static', (m) => (m as { path?: string })?.path)
    if (ffprobe) {
      try {
        const { stdout } = await run(ffprobe, ['-v', 'error', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', path], { timeout: 15_000 })
        const j = JSON.parse(stdout) as { streams?: { width?: number; height?: number }[]; format?: { duration?: string } }
        const v = (j.streams ?? []).find((s) => s.width && s.height)
        if (v) {
          meta.width = v.width
          meta.height = v.height
        }
        const dur = Number(j.format?.duration)
        if (Number.isFinite(dur) && dur > 0) meta.durationSeconds = dur
      } catch {
        /* metadata optional */
      }
    }
    const ffmpeg = await ffBinary('ffmpeg-static', (m) => (typeof m === 'string' ? m : undefined))
    if (ffmpeg) {
      try {
        const out = join(thumbDir, thumbName(path))
        if (!existsSync(out)) {
          const at = meta.durationSeconds ? Math.min(1, meta.durationSeconds / 2) : 0
          await run(ffmpeg, ['-y', '-ss', String(at), '-i', path, '-frames:v', '1', '-vf', 'scale=360:-1', out], { timeout: 20_000 })
        }
        if (existsSync(out)) meta.thumb = `pbthumb://${thumbName(path)}`
      } catch {
        /* thumbnail optional */
      }
    }
    return meta
  }

  return {
    probe: (path) => (kindFromPath(path) === 'video' ? probeVideo(path) : probeImage(path)),
  }
}

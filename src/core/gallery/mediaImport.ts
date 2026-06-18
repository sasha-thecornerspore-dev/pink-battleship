import type { Asset, AssetMediaKind } from '@shared/models'

/**
 * Reference-in-place media import. The app never copies the original bytes — an
 * asset records the absolute source path plus extracted metadata. Probing
 * (dimensions, duration, thumbnail) is done by an injected MediaProbe so the
 * import/dedupe logic here stays pure and unit-testable without sharp/ffmpeg.
 */

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'heic', 'bmp', 'tiff'])
const VIDEO_EXT = new Set(['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi', 'wmv', 'flv'])

export function extOf(path: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(path.trim())
  return m ? m[1].toLowerCase() : ''
}

export function basename(path: string): string {
  const parts = path.replace(/[\\/]+$/, '').split(/[\\/]/)
  return parts[parts.length - 1] || path
}

/** Classify by extension; defaults to image for unknown types. */
export function kindFromPath(path: string): AssetMediaKind {
  return VIDEO_EXT.has(extOf(path)) ? 'video' : 'image'
}

export function isSupportedMedia(path: string): boolean {
  const e = extOf(path)
  return IMAGE_EXT.has(e) || VIDEO_EXT.has(e)
}

export interface MediaMeta {
  width?: number
  height?: number
  durationSeconds?: number
  /** A pbthumb:// URL if a thumbnail was generated. */
  thumb?: string
}

export interface ProbedFile {
  path: string
  sizeBytes: number
  meta: MediaMeta
}

export interface MediaProbe {
  probe(path: string): Promise<MediaMeta>
}

function mmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = Math.round(totalSeconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Human-readable dims: "1920×1080" for images, "1:23" for video, else "". */
export function dimsLabel(kind: AssetMediaKind, meta: MediaMeta): string {
  if (kind === 'video' && meta.durationSeconds && meta.durationSeconds > 0) return mmss(meta.durationSeconds)
  if (meta.width && meta.height) return `${meta.width}×${meta.height}`
  return ''
}

export type NewImportedAsset = Omit<Asset, 'id' | 'galleryId' | 'addedAt'>

/** Build the asset draft for one probed file. NSFW defaults true (creator can clear it). */
export function toImportedAsset(file: ProbedFile): NewImportedAsset {
  const kind = kindFromPath(file.path)
  return {
    filename: basename(file.path),
    mediaKind: kind,
    nsfw: true,
    tags: [],
    postedTo: [],
    dims: dimsLabel(kind, file.meta),
    sourcePath: file.path,
    sizeBytes: file.sizeBytes,
    durationSeconds: kind === 'video' ? file.meta.durationSeconds : undefined,
    thumb: file.meta.thumb,
  }
}

/**
 * Turn probed files into asset drafts, skipping ones already in the gallery by
 * source path (re-importing the same folder is idempotent) and any duplicate
 * paths within the same batch.
 */
export function buildImportDrafts(existing: Asset[], files: ProbedFile[]): { drafts: NewImportedAsset[]; skipped: number } {
  const seen = new Set(existing.map((a) => a.sourcePath).filter(Boolean) as string[])
  const drafts: NewImportedAsset[] = []
  let skipped = 0
  for (const f of files) {
    if (seen.has(f.path)) {
      skipped++
      continue
    }
    seen.add(f.path)
    drafts.push(toImportedAsset(f))
  }
  return { drafts, skipped }
}

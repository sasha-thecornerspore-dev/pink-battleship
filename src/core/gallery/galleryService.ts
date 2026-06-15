import type { Database } from '../db/database'
import type { Asset, Gallery } from '@shared/models'

const G_KEY = 'dam:galleries'
const A_KEY = 'dam:assets'
const MASTER_ID = 'master'

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export type NewAsset = Omit<Asset, 'id' | 'galleryId' | 'addedAt'>

/**
 * Metadata-first digital asset manager. Galleries and assets are stored as JSON
 * in the encrypted settings store (no new tables): a virtual "master" gallery is
 * the union of all assets; "sets" are sellable subsets. Real file import +
 * thumbnails are a later refinement; this models the structure, tagging, and
 * cross-platform posted-status.
 */
export class GalleryService {
  constructor(private readonly db: Database) {}

  private gRead(): Gallery[] {
    const r = this.db.getSetting(G_KEY)
    return r ? (JSON.parse(r) as Gallery[]) : []
  }
  private gWrite(g: Gallery[]): void {
    this.db.setSetting(G_KEY, JSON.stringify(g))
  }
  private aRead(): Asset[] {
    const r = this.db.getSetting(A_KEY)
    return r ? (JSON.parse(r) as Asset[]) : []
  }
  private aWrite(a: Asset[]): void {
    this.db.setSetting(A_KEY, JSON.stringify(a))
  }

  private ensureMaster(gs: Gallery[]): Gallery[] {
    if (gs.some((g) => g.kind === 'master')) return gs
    const master: Gallery = { id: MASTER_ID, name: 'Master gallery', kind: 'master', createdAt: '', assetCount: 0 }
    const next = [master, ...gs]
    this.gWrite(next)
    return next
  }

  galleries(): Gallery[] {
    const gs = this.ensureMaster(this.gRead())
    const assets = this.aRead()
    return gs.map((g) => ({
      ...g,
      assetCount: g.kind === 'master' ? assets.length : assets.filter((a) => a.galleryId === g.id).length,
    }))
  }

  assets(galleryId: string): Asset[] {
    const gs = this.ensureMaster(this.gRead())
    const g = gs.find((x) => x.id === galleryId)
    const all = this.aRead()
    return g?.kind === 'master' ? all : all.filter((a) => a.galleryId === galleryId)
  }

  createSet(name: string): Gallery {
    const gs = this.ensureMaster(this.gRead())
    const set: Gallery = { id: `set:${slug(name) || 'set'}-${gs.length}`, name, kind: 'set', createdAt: '', assetCount: 0 }
    this.gWrite([...gs, set])
    return set
  }

  addAssets(galleryId: string, items: NewAsset[]): Asset[] {
    const all = this.aRead()
    const added: Asset[] = items.map((it, i) => ({ ...it, id: `asset:${galleryId}:${all.length + i}`, galleryId, addedAt: '' }))
    this.aWrite([...all, ...added])
    return added
  }

  setTags(assetId: string, tags: string[]): void {
    this.aWrite(this.aRead().map((a) => (a.id === assetId ? { ...a, tags } : a)))
  }

  togglePosted(assetId: string, platformId: string): void {
    this.aWrite(
      this.aRead().map((a) => {
        if (a.id !== assetId) return a
        const has = a.postedTo.includes(platformId)
        return { ...a, postedTo: has ? a.postedTo.filter((p) => p !== platformId) : [...a.postedTo, platformId] }
      }),
    )
  }
}

import { describe, it, expect } from 'vitest'
import { InMemoryDatabase } from '../db/inMemoryDatabase'
import { GalleryService } from './galleryService'

describe('GalleryService', () => {
  it('lazily creates a master gallery and counts assets', () => {
    const svc = new GalleryService(new InMemoryDatabase())
    expect(svc.galleries().some((g) => g.kind === 'master')).toBe(true)
    svc.addAssets('master', [
      { filename: 'shoot1.jpg', mediaKind: 'image', nsfw: true, tags: ['lingerie'], postedTo: ['onlyfans'], dims: '1920×1080' },
    ])
    expect(svc.galleries().find((g) => g.kind === 'master')?.assetCount).toBe(1)
    expect(svc.assets('master')).toHaveLength(1)
  })

  it('creates sets and toggles tags + posted status', () => {
    const svc = new GalleryService(new InMemoryDatabase())
    const set = svc.createSet('Spring PPV')
    const [asset] = svc.addAssets(set.id, [{ filename: 'a.mp4', mediaKind: 'video', nsfw: true, tags: [], postedTo: [], dims: '0:42' }])
    svc.setTags(asset.id, ['ppv', 'teaser'])
    svc.togglePosted(asset.id, 'fansly')
    const a = svc.assets(set.id)[0]
    expect(a.tags).toEqual(['ppv', 'teaser'])
    expect(a.postedTo).toEqual(['fansly'])
    expect(svc.galleries().find((g) => g.id === set.id)?.assetCount).toBe(1)
    // master sees the set's asset too
    expect(svc.assets('master')).toHaveLength(1)
  })
})

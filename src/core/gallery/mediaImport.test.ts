import { describe, it, expect } from 'vitest'
import { extOf, basename, kindFromPath, isSupportedMedia, dimsLabel, toImportedAsset, buildImportDrafts, type ProbedFile } from './mediaImport'
import type { Asset } from '@shared/models'

describe('mediaImport helpers', () => {
  it('extracts extension and basename across separators', () => {
    expect(extOf('C:\\shoots\\blue_01.JPG')).toBe('jpg')
    expect(basename('C:\\shoots\\blue_01.jpg')).toBe('blue_01.jpg')
    expect(basename('/home/x/clip.mp4')).toBe('clip.mp4')
  })

  it('classifies media kind by extension, defaulting to image', () => {
    expect(kindFromPath('a/b.mp4')).toBe('video')
    expect(kindFromPath('a/b.png')).toBe('image')
    expect(kindFromPath('a/b.unknown')).toBe('image')
    expect(isSupportedMedia('a/b.mov')).toBe(true)
    expect(isSupportedMedia('a/b.txt')).toBe(false)
  })

  it('labels dims as W×H for images and m:ss for video', () => {
    expect(dimsLabel('image', { width: 1920, height: 1080 })).toBe('1920×1080')
    expect(dimsLabel('video', { durationSeconds: 83 })).toBe('1:23')
    expect(dimsLabel('image', {})).toBe('')
  })

  it('builds an asset draft referencing the source path (never copies)', () => {
    const draft = toImportedAsset({ path: 'D:\\sets\\teaser.mp4', sizeBytes: 2048, meta: { durationSeconds: 18, thumb: 'pbthumb://t.jpg' } })
    expect(draft).toMatchObject({
      filename: 'teaser.mp4',
      mediaKind: 'video',
      nsfw: true,
      dims: '0:18',
      sourcePath: 'D:\\sets\\teaser.mp4',
      sizeBytes: 2048,
      durationSeconds: 18,
      thumb: 'pbthumb://t.jpg',
    })
  })

  it('dedupes against existing assets and within the batch by source path', () => {
    const existing: Asset[] = [
      { id: 'a1', galleryId: 'master', filename: 'a.jpg', mediaKind: 'image', nsfw: true, tags: [], postedTo: [], dims: '', addedAt: '', sourcePath: '/p/a.jpg' },
    ]
    const files: ProbedFile[] = [
      { path: '/p/a.jpg', sizeBytes: 1, meta: {} }, // already imported
      { path: '/p/b.jpg', sizeBytes: 2, meta: { width: 800, height: 600 } },
      { path: '/p/b.jpg', sizeBytes: 2, meta: {} }, // dup within batch
    ]
    const { drafts, skipped } = buildImportDrafts(existing, files)
    expect(drafts).toHaveLength(1)
    expect(drafts[0].sourcePath).toBe('/p/b.jpg')
    expect(drafts[0].dims).toBe('800×600')
    expect(skipped).toBe(2)
  })
})

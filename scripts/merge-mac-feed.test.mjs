import { describe, expect, it } from 'vitest'
import { mergeFeeds, parseFeed } from './merge-mac-feed.mjs'

const arm = `version: 0.2.0
files:
  - url: PinkBattleship-0.2.0-mac-arm64.zip
    sha512: AAA==
    size: 100
  - url: PinkBattleship-0.2.0-mac-arm64.dmg
    sha512: BBB==
    size: 110
path: PinkBattleship-0.2.0-mac-arm64.zip
sha512: AAA==
releaseDate: '2026-10-05T00:00:00.000Z'
`

const x64 = `version: 0.2.0\r
files:\r
  - url: PinkBattleship-0.2.0-mac-x64.zip\r
    sha512: CCC==\r
    size: 200\r
  - url: PinkBattleship-0.2.0-mac-x64.dmg\r
    sha512: DDD==\r
    size: 210\r
path: PinkBattleship-0.2.0-mac-x64.zip\r
sha512: CCC==\r
releaseDate: '2026-10-05T00:01:00.000Z'\r
`

describe('merge-mac-feed', () => {
  it('combines both arches into one files list, keeping the first feed’s top-level fields', () => {
    const merged = mergeFeeds(arm, x64)
    const f = parseFeed(merged)
    expect(f.version).toBe('0.2.0')
    expect(f.files.map((e) => e.match(/url:\s*(\S+)/)[1])).toEqual([
      'PinkBattleship-0.2.0-mac-arm64.zip',
      'PinkBattleship-0.2.0-mac-arm64.dmg',
      'PinkBattleship-0.2.0-mac-x64.zip',
      'PinkBattleship-0.2.0-mac-x64.dmg',
    ])
    expect(merged.startsWith('version: 0.2.0\nfiles:\n  - url:')).toBe(true)
    expect(merged).toContain('path: PinkBattleship-0.2.0-mac-arm64.zip')
    expect(merged).toContain('    sha512: CCC==\n    size: 200')
    expect(merged).not.toContain('\r')
  })

  it('refuses to merge feeds for different versions', () => {
    expect(() => mergeFeeds(arm, x64.replace(/0\.2\.0/g, '0.2.1'))).toThrow(/mismatch/)
  })

  it('dedupes identical entries', () => {
    expect(parseFeed(mergeFeeds(arm, arm)).files).toHaveLength(2)
  })

  it('rejects feeds without files', () => {
    expect(() => parseFeed('version: 1.0.0\n')).toThrow(/no files/)
  })
})

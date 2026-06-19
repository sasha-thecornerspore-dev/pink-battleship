import { describe, it, expect } from 'vitest'
import { isSafeExternalUrl } from './externalLink'

describe('isSafeExternalUrl', () => {
  it('allows http and https', () => {
    expect(isSafeExternalUrl('https://ollama.com/download')).toBe(true)
    expect(isSafeExternalUrl('http://example.com')).toBe(true)
  })

  it('rejects non-web schemes and junk', () => {
    expect(isSafeExternalUrl('file:///C:/secret.txt')).toBe(false)
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeExternalUrl('data:text/html,<x>')).toBe(false)
    expect(isSafeExternalUrl('not a url')).toBe(false)
    expect(isSafeExternalUrl('')).toBe(false)
  })
})

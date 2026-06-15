import { describe, it, expect } from 'vitest'
import { generateDbKey, generateSalt, deriveWrappingKey, wrapKey, unwrapKey, zeroize } from './keyvault'

describe('keyvault', () => {
  it('round-trips a wrapped DB key with the correct passphrase', () => {
    const dbKey = generateDbKey()
    const salt = generateSalt()
    const blob = wrapKey(dbKey, deriveWrappingKey('correct horse battery', salt))
    const out = unwrapKey(blob, deriveWrappingKey('correct horse battery', salt))
    expect(Buffer.compare(out, dbKey)).toBe(0)
  })

  it('fails to unwrap with the wrong passphrase', () => {
    const dbKey = generateDbKey()
    const salt = generateSalt()
    const blob = wrapKey(dbKey, deriveWrappingKey('right', salt))
    expect(() => unwrapKey(blob, deriveWrappingKey('wrong', salt))).toThrow()
  })

  it('derives a stable key for the same passphrase + salt', () => {
    const salt = generateSalt()
    expect(Buffer.compare(deriveWrappingKey('p', salt), deriveWrappingKey('p', salt))).toBe(0)
  })

  it('zeroize wipes the buffer', () => {
    const b = Buffer.from('secret-bytes-here')
    zeroize(b)
    expect(b.every((x) => x === 0)).toBe(true)
  })
})

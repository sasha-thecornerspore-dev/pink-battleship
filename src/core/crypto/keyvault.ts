import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'node:crypto'

// scrypt parameters (interactive). Argon2id is a noted future hardening upgrade;
// scrypt is built into Node (zero native deps) and a solid KDF for v1.
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

export function generateDbKey(): Buffer {
  return randomBytes(32)
}

export function generateSalt(): Buffer {
  return randomBytes(16)
}

export function deriveWrappingKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, 32, SCRYPT)
}

export interface WrappedKey {
  v: 1
  iv: string
  tag: string
  ct: string
}

export function wrapKey(dbKey: Buffer, wrappingKey: Buffer): WrappedKey {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', wrappingKey, iv)
  const ct = Buffer.concat([cipher.update(dbKey), cipher.final()])
  return {
    v: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ct: ct.toString('base64'),
  }
}

export function unwrapKey(blob: WrappedKey, wrappingKey: Buffer): Buffer {
  const decipher = createDecipheriv('aes-256-gcm', wrappingKey, Buffer.from(blob.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(blob.tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(blob.ct, 'base64')), decipher.final()])
}

export function zeroize(b: Buffer): void {
  b.fill(0)
}

import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'
import { deriveWrappingKey, generateSalt } from '@core/crypto/keyvault'
import type { DbSnapshot } from '@core/db/database'

/**
 * A portable, password-encrypted vault backup. The snapshot JSON is sealed with
 * AES-256-GCM under a scrypt-derived key (same KDF as the vault). The password is
 * the user's choice — never stored — so the backup is useless without it. GCM's
 * auth tag means a wrong password or any tampering fails to decrypt rather than
 * returning garbage. This is the one file a creator can carry to a new machine.
 */
export interface BackupFile {
  app: 'pink-battleship'
  v: 1
  createdAt: string
  salt: string
  iv: string
  tag: string
  ct: string
}

export class BackupOpenError extends Error {
  constructor() {
    super('Could not open this backup — wrong password, or the file is not a valid Pink Battleship backup.')
    this.name = 'BackupOpenError'
  }
}

export function sealBackup(snapshot: DbSnapshot, password: string, createdAt: string): BackupFile {
  const salt = generateSalt()
  const key = deriveWrappingKey(password, salt)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(snapshot), 'utf8')), cipher.final()])
  return {
    app: 'pink-battleship',
    v: 1,
    createdAt,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ct: ct.toString('base64'),
  }
}

export function openBackup(file: BackupFile, password: string): DbSnapshot {
  if (!file || file.app !== 'pink-battleship' || file.v !== 1) throw new BackupOpenError()
  try {
    const key = deriveWrappingKey(password, Buffer.from(file.salt, 'base64'))
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(file.iv, 'base64'))
    decipher.setAuthTag(Buffer.from(file.tag, 'base64'))
    const pt = Buffer.concat([decipher.update(Buffer.from(file.ct, 'base64')), decipher.final()])
    return JSON.parse(pt.toString('utf8')) as DbSnapshot
  } catch {
    throw new BackupOpenError()
  }
}

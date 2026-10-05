import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SecretStore } from './secretStore'

/**
 * SecretStore backed by Electron safeStorage (Windows DPAPI / macOS Keychain /
 * libsecret). Each value is encrypted individually; the ciphertexts live as
 * base64 in a JSON file under userData. Fails closed: never writes plaintext.
 */
export class SafeStorageSecretStore implements SecretStore {
  private readonly file: string
  private cache: Record<string, string> | null = null

  constructor(file = join(app.getPath('userData'), 'secrets.json')) {
    this.file = file
  }

  get(key: string): string | null {
    const enc = this.load()[key]
    if (!enc) return null
    try {
      return safeStorage.decryptString(Buffer.from(enc, 'base64'))
    } catch {
      return null
    }
  }

  set(key: string, value: string): void {
    this.requireEncryption()
    const all = { ...this.load(), [key]: safeStorage.encryptString(value).toString('base64') }
    this.save(all)
  }

  delete(key: string): void {
    const all = { ...this.load() }
    if (!(key in all)) return
    delete all[key]
    this.save(all)
  }

  private requireEncryption(): void {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('OS secure storage is unavailable — refusing to store secrets in plaintext')
    // Linux without a keyring silently falls back to a hard-coded key; treat as unavailable.
    if (process.platform === 'linux' && safeStorage.getSelectedStorageBackend?.() === 'basic_text') {
      throw new Error('No OS keyring found (basic_text backend) — refusing to store secrets')
    }
  }

  private load(): Record<string, string> {
    if (this.cache) return this.cache
    try {
      this.cache = existsSync(this.file) ? (JSON.parse(readFileSync(this.file, 'utf8')) as Record<string, string>) : {}
    } catch {
      this.cache = {}
    }
    return this.cache
  }

  private save(all: Record<string, string>): void {
    const tmp = `${this.file}.tmp`
    writeFileSync(tmp, JSON.stringify(all), { mode: 0o600 })
    renameSync(tmp, this.file)
    this.cache = all
  }
}

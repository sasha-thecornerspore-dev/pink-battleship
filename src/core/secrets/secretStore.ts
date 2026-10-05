/** Small key/value store for credentials (vault key blob, API keys, tokens). */
export interface SecretStore {
  get(key: string): string | null
  set(key: string, value: string): void
  delete(key: string): void
}

/** In-memory store for tests and the browser demo. */
export class MemorySecretStore implements SecretStore {
  private readonly map = new Map<string, string>()
  get(key: string): string | null {
    return this.map.get(key) ?? null
  }
  set(key: string, value: string): void {
    this.map.set(key, value)
  }
  delete(key: string): void {
    this.map.delete(key)
  }
}

import { describe, it, expect } from 'vitest'
import { initialHealth, onSyncSuccess, onSyncFailure, shouldAutoSync } from './health'

describe('connector health state machine', () => {
  it('starts as needs_sync and is auto-syncable', () => {
    const s = initialHealth()
    expect(s.status).toBe('needs_sync')
    expect(shouldAutoSync(s)).toBe(true)
  })

  it('becomes healthy after a successful sync', () => {
    const s = onSyncSuccess(initialHealth(), '2026-06-13T00:00:00Z')
    expect(s.status).toBe('healthy')
    expect(s.lastSyncAt).toBe('2026-06-13T00:00:00Z')
  })

  it('becomes broken on failure and must not auto-retry', () => {
    const s = onSyncFailure(initialHealth(), 'token expired')
    expect(s.status).toBe('broken')
    expect(s.lastError).toBe('token expired')
    expect(shouldAutoSync(s)).toBe(false)
  })
})

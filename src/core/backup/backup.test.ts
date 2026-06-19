import { describe, it, expect } from 'vitest'
import { sealBackup, openBackup, BackupOpenError } from './backupFile'
import { InMemoryDatabase } from '@core/db/inMemoryDatabase'
import type { DbSnapshot } from '@core/db/database'

const snapshot: DbSnapshot = {
  transactions: [
    { id: 't1', connectorId: 'manual:onlyfans', platformId: 'onlyfans', occurredAt: '2026-05-01', grossAmount: 24.99, currency: 'USD', kind: 'sub', externalId: null, payerRef: 'amber' },
  ],
  connectors: [{ id: 'manual:onlyfans', platformId: 'onlyfans', driver: 'manual', riskLabel: 'manual-none', status: 'healthy', lastSyncAt: null }],
  rateRules: [{ id: 'of', platformId: 'onlyfans', kind: 'platform_cut', rate: 0.2, fixedFee: 0, effectiveFrom: '2020-01-01', effectiveTo: null, note: 'OF', isEstimate: true }],
  settings: { theme: 'blush', 'website:config': '{"handle":"rosie"}' },
}

describe('backup seal/open', () => {
  it('round-trips a snapshot through the right password', () => {
    const file = sealBackup(snapshot, 'hunter2', '2026-06-18T00:00:00Z')
    expect(file.app).toBe('pink-battleship')
    expect(openBackup(file, 'hunter2')).toEqual(snapshot)
  })

  it('refuses the wrong password (auth tag fails, no garbage returned)', () => {
    const file = sealBackup(snapshot, 'right', '2026-06-18T00:00:00Z')
    expect(() => openBackup(file, 'wrong')).toThrow(BackupOpenError)
  })

  it('refuses a tampered ciphertext', () => {
    const file = sealBackup(snapshot, 'pw', '2026-06-18T00:00:00Z')
    expect(() => openBackup({ ...file, ct: Buffer.from('tampered').toString('base64') }, 'pw')).toThrow(BackupOpenError)
  })

  it('refuses a non-Pink-Battleship file', () => {
    const file = sealBackup(snapshot, 'pw', '2026-06-18T00:00:00Z')
    expect(() => openBackup({ ...file, app: 'something-else' as 'pink-battleship' }, 'pw')).toThrow(BackupOpenError)
  })
})

describe('snapshot export/import round-trip through the DB', () => {
  it('restores transactions, connectors, rules, and settings; replaces existing data', () => {
    const db = new InMemoryDatabase()
    db.importSnapshot(snapshot)
    const dumped = db.exportSnapshot()
    expect(dumped).toEqual(snapshot)

    // Importing a different snapshot replaces, not merges.
    db.importSnapshot({ transactions: [], connectors: [], rateRules: [], settings: { theme: 'rose' } })
    expect(db.exportSnapshot().transactions).toHaveLength(0)
    expect(db.getSetting('theme')).toBe('rose')
    expect(db.getSetting('website:config')).toBeNull()
  })
})

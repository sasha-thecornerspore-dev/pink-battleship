import type { ConnectorInfo, EgressEntry, PlatformId, RateRule, Transaction } from '@shared/models'

export interface TransactionFilter {
  from?: string
  to?: string
  platformId?: PlatformId
}

/** A complete dump of the vault's data (everything except the ephemeral egress log). */
export interface DbSnapshot {
  transactions: Transaction[]
  connectors: ConnectorInfo[]
  rateRules: RateRule[]
  settings: Record<string, string>
}

/**
 * Narrow persistence port. The app wires the SQLCipher-backed adapter; tests
 * (and a demo mode) use InMemoryDatabase. Keeping this small keeps the core
 * testable without the native module.
 */
export interface Database {
  insertTransactions(txs: Transaction[]): void
  queryTransactions(filter?: TransactionFilter): Transaction[]
  listRateRules(platformId?: PlatformId): RateRule[]
  upsertRateRule(rule: RateRule): void
  listConnectors(): ConnectorInfo[]
  upsertConnector(c: ConnectorInfo): void
  removeConnector(id: string): void
  getSetting(key: string): string | null
  setSetting(key: string, value: string): void
  appendEgress(entry: EgressEntry): void
  listEgress(limit?: number): EgressEntry[]
  /** Dump all data for an encrypted backup. */
  exportSnapshot(): DbSnapshot
  /** Replace all data with a snapshot (restore). Atomic. */
  importSnapshot(snapshot: DbSnapshot): void
  close(): void
}

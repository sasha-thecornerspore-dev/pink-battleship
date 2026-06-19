import type { Database, DbSnapshot, TransactionFilter } from './database'
import type { ConnectorInfo, EgressEntry, PlatformId, RateRule, Transaction } from '@shared/models'

export class InMemoryDatabase implements Database {
  private txs: Transaction[] = []
  private rules: RateRule[] = []
  private connectors = new Map<string, ConnectorInfo>()
  private settings = new Map<string, string>()
  private egress: EgressEntry[] = []

  insertTransactions(txs: Transaction[]): void {
    for (const t of txs) {
      const i = this.txs.findIndex((x) => x.id === t.id)
      if (i >= 0) this.txs[i] = t
      else this.txs.push(t)
    }
  }

  queryTransactions(filter: TransactionFilter = {}): Transaction[] {
    return this.txs.filter((t) => {
      if (filter.platformId && t.platformId !== filter.platformId) return false
      if (filter.from && t.occurredAt < filter.from) return false
      if (filter.to && t.occurredAt > filter.to) return false
      return true
    })
  }

  listRateRules(platformId?: PlatformId): RateRule[] {
    return this.rules.filter((r) => !platformId || r.platformId === platformId)
  }

  upsertRateRule(rule: RateRule): void {
    const i = this.rules.findIndex((r) => r.id === rule.id)
    if (i >= 0) this.rules[i] = rule
    else this.rules.push(rule)
  }

  listConnectors(): ConnectorInfo[] {
    return [...this.connectors.values()]
  }

  upsertConnector(c: ConnectorInfo): void {
    this.connectors.set(c.id, c)
  }

  removeConnector(id: string): void {
    this.connectors.delete(id)
  }

  getSetting(key: string): string | null {
    return this.settings.get(key) ?? null
  }

  setSetting(key: string, value: string): void {
    this.settings.set(key, value)
  }

  appendEgress(entry: EgressEntry): void {
    this.egress.push(entry)
  }

  listEgress(limit = 200): EgressEntry[] {
    return this.egress.slice(-limit).reverse()
  }

  exportSnapshot(): DbSnapshot {
    return {
      transactions: [...this.txs],
      connectors: [...this.connectors.values()],
      rateRules: [...this.rules],
      settings: Object.fromEntries(this.settings),
    }
  }

  importSnapshot(s: DbSnapshot): void {
    this.txs = [...s.transactions]
    this.rules = [...s.rateRules]
    this.connectors = new Map(s.connectors.map((c) => [c.id, c]))
    this.settings = new Map(Object.entries(s.settings))
    // egress log is ephemeral — not restored
  }

  close(): void {
    /* nothing to release */
  }
}

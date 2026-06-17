import Database from 'better-sqlite3-multiple-ciphers'
import type { Database as DbPort, TransactionFilter } from './database'
import type { ConnectorInfo, EgressEntry, PlatformId, RateRule, Transaction } from '@shared/models'
import { SCHEMA_V1 } from './migrations'

interface TxRow {
  id: string
  connector_id: string
  platform_id: string
  occurred_at: string
  gross_amount: number
  currency: string
  kind: string
  external_id: string | null
  payer_ref: string | null
  raw: string | null
}
interface ConnRow {
  id: string
  platform_id: string
  driver: string
  risk_label: string
  status: string
  last_sync_at: string | null
}
interface RuleRow {
  id: string
  platform_id: string
  kind: string
  rate: number
  fixed_fee: number
  effective_from: string
  effective_to: string | null
  note: string | null
  is_estimate: number
}
interface EgressRow {
  ts: string
  connector_id: string | null
  host: string
  purpose: string
}

/**
 * SQLCipher-backed adapter (better-sqlite3-multiple-ciphers). Loaded only in the
 * Electron main process. The DB is opened with a raw 32-byte key via PRAGMA key.
 */
export class SqlcipherDatabase implements DbPort {
  private db

  constructor(path: string, key: Buffer) {
    this.db = new Database(path)
    this.db.pragma(`key = "x'${key.toString('hex')}'"`)
    this.db.pragma('journal_mode = WAL')
    this.db.exec(SCHEMA_V1)
  }

  insertTransactions(txs: Transaction[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO transactions (id, connector_id, platform_id, occurred_at, gross_amount, currency, kind, external_id, payer_ref, raw)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        connector_id=excluded.connector_id, platform_id=excluded.platform_id, occurred_at=excluded.occurred_at,
        gross_amount=excluded.gross_amount, currency=excluded.currency, kind=excluded.kind,
        external_id=excluded.external_id, payer_ref=excluded.payer_ref, raw=excluded.raw
    `)
    for (const t of txs) {
      stmt.run(
        t.id,
        t.connectorId,
        t.platformId,
        t.occurredAt,
        t.grossAmount,
        t.currency,
        t.kind,
        t.externalId,
        t.payerRef,
        t.raw === undefined ? null : JSON.stringify(t.raw),
      )
    }
  }

  queryTransactions(filter: TransactionFilter = {}): Transaction[] {
    const where: string[] = []
    const params: unknown[] = []
    if (filter.platformId) {
      where.push('platform_id = ?')
      params.push(filter.platformId)
    }
    if (filter.from) {
      where.push('occurred_at >= ?')
      params.push(filter.from)
    }
    if (filter.to) {
      where.push('occurred_at <= ?')
      params.push(filter.to)
    }
    const sql = `SELECT * FROM transactions ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY occurred_at`
    const rows = this.db.prepare(sql).all(...params) as TxRow[]
    return rows.map((r) => ({
      id: r.id,
      connectorId: r.connector_id,
      platformId: r.platform_id,
      occurredAt: r.occurred_at,
      grossAmount: r.gross_amount,
      currency: r.currency,
      kind: r.kind as Transaction['kind'],
      externalId: r.external_id,
      payerRef: r.payer_ref,
      raw: r.raw ? JSON.parse(r.raw) : undefined,
    }))
  }

  listRateRules(platformId?: PlatformId): RateRule[] {
    const rows = (
      platformId
        ? this.db.prepare('SELECT * FROM rate_rules WHERE platform_id = ?').all(platformId)
        : this.db.prepare('SELECT * FROM rate_rules').all()
    ) as RuleRow[]
    return rows.map((r) => ({
      id: r.id,
      platformId: r.platform_id,
      kind: r.kind as RateRule['kind'],
      rate: r.rate,
      fixedFee: r.fixed_fee,
      effectiveFrom: r.effective_from,
      effectiveTo: r.effective_to,
      note: r.note ?? undefined,
      isEstimate: !!r.is_estimate,
    }))
  }

  upsertRateRule(rule: RateRule): void {
    this.db
      .prepare(`
        INSERT INTO rate_rules (id, platform_id, kind, rate, fixed_fee, effective_from, effective_to, note, is_estimate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, rate=excluded.rate,
          fixed_fee=excluded.fixed_fee, effective_from=excluded.effective_from, effective_to=excluded.effective_to,
          note=excluded.note, is_estimate=excluded.is_estimate
      `)
      .run(
        rule.id,
        rule.platformId,
        rule.kind,
        rule.rate,
        rule.fixedFee,
        rule.effectiveFrom,
        rule.effectiveTo,
        rule.note ?? null,
        rule.isEstimate ? 1 : 0,
      )
  }

  listConnectors(): ConnectorInfo[] {
    const rows = this.db.prepare('SELECT * FROM connectors').all() as ConnRow[]
    return rows.map((r) => ({
      id: r.id,
      platformId: r.platform_id,
      driver: r.driver as ConnectorInfo['driver'],
      riskLabel: r.risk_label as ConnectorInfo['riskLabel'],
      status: r.status as ConnectorInfo['status'],
      lastSyncAt: r.last_sync_at,
    }))
  }

  upsertConnector(c: ConnectorInfo): void {
    this.db
      .prepare(`
        INSERT INTO connectors (id, platform_id, driver, risk_label, status, last_sync_at, config)
        VALUES (?, ?, ?, ?, ?, ?, NULL)
        ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, driver=excluded.driver,
          risk_label=excluded.risk_label, status=excluded.status, last_sync_at=excluded.last_sync_at
      `)
      .run(c.id, c.platformId, c.driver, c.riskLabel, c.status, c.lastSyncAt)
  }

  removeConnector(id: string): void {
    this.db.prepare('DELETE FROM connectors WHERE id = ?').run(id)
  }

  getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return row ? row.value : null
  }

  setSetting(key: string, value: string): void {
    this.db
      .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
      .run(key, value)
  }

  appendEgress(entry: EgressEntry): void {
    this.db
      .prepare('INSERT INTO egress_log (ts, connector_id, host, purpose) VALUES (?, ?, ?, ?)')
      .run(entry.ts, entry.connectorId, entry.host, entry.purpose)
  }

  listEgress(limit = 200): EgressEntry[] {
    const rows = this.db
      .prepare('SELECT ts, connector_id, host, purpose FROM egress_log ORDER BY id DESC LIMIT ?')
      .all(limit) as EgressRow[]
    return rows.map((r) => ({ ts: r.ts, connectorId: r.connector_id, host: r.host, purpose: r.purpose }))
  }

  close(): void {
    this.db.close()
  }
}

import type { Transaction, TransactionKind } from '@shared/models'

export interface CsvColumnMap {
  date: string
  amount: string
  kind?: string
  payer?: string
  currency?: string
}

export interface CsvImportOptions {
  platformId: string
  connectorId?: string
  map: CsvColumnMap
  defaultCurrency?: string
}

export interface CsvImportResult {
  transactions: Transaction[]
  skipped: { line: number; reason: string }[]
}

const KINDS = new Set<TransactionKind>(['tip', 'sub', 'ppv', 'clip', 'other'])

function normalizeKind(v: string | undefined): TransactionKind {
  const k = (v ?? '').trim().toLowerCase() as TransactionKind
  return KINDS.has(k) ? k : 'other'
}

function parseLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQ = false
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQ = true
    } else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

export function parseCsvTransactions(csv: string, opts: CsvImportOptions): CsvImportResult {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const result: CsvImportResult = { transactions: [], skipped: [] }
  if (lines.length === 0) return result

  const header = parseLine(lines[0])
  const di = header.indexOf(opts.map.date)
  const ai = header.indexOf(opts.map.amount)
  const ki = opts.map.kind ? header.indexOf(opts.map.kind) : -1
  const pi = opts.map.payer ? header.indexOf(opts.map.payer) : -1
  const ci = opts.map.currency ? header.indexOf(opts.map.currency) : -1
  const defaultCurrency = opts.defaultCurrency ?? 'USD'
  const connectorId = opts.connectorId ?? `manual:${opts.platformId}`

  for (let n = 1; n < lines.length; n++) {
    const cols = parseLine(lines[n])
    const dateRaw = di >= 0 ? cols[di] : undefined
    const amountRaw = ai >= 0 ? cols[ai] : undefined
    const amountClean = amountRaw === undefined ? undefined : amountRaw.replace(/[$,\s]/g, '')
    const amount = Number(amountClean)
    if (!dateRaw || !amountClean || Number.isNaN(amount)) {
      result.skipped.push({ line: n + 1, reason: 'missing or invalid date/amount' })
      continue
    }
    result.transactions.push({
      id: `${connectorId}:${n}:${dateRaw}`,
      connectorId,
      platformId: opts.platformId,
      occurredAt: dateRaw,
      grossAmount: amount,
      currency: ci >= 0 && cols[ci] ? cols[ci] : defaultCurrency,
      kind: normalizeKind(ki >= 0 ? cols[ki] : undefined),
      externalId: null,
      payerRef: pi >= 0 && cols[pi] ? cols[pi] : null,
    })
  }
  return result
}

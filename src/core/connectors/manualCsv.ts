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

export function parseCsvHeaders(csv: string): string[] {
  const first = csv.split(/\r?\n/).find((l) => l.trim().length > 0)
  return first ? parseLine(first) : []
}

// Per-platform column-name preferences, in priority order. These bias the guess
// toward each platform's export shape (e.g. OnlyFans/ManyVids list a post-cut
// "net" column); the generic regex still covers anything not listed.
const PLATFORM_AMOUNT: Record<string, string[]> = {
  onlyfans: ['net', 'amount', 'gross', 'earning', 'total'],
  fansly: ['amount', 'net', 'gross', 'earning'],
  manyvids: ['net', 'earning', 'price', 'amount', 'sale'],
  chaturbate: ['token', 'amount', 'earning'],
}
const PLATFORM_PAYER: Record<string, string[]> = {
  onlyfans: ['user', 'fan', 'from', 'name'],
  fansly: ['user', 'fan', 'from'],
  manyvids: ['buyer', 'customer', 'user'],
  chaturbate: ['user', 'tipper', 'fan', 'username'],
}

function findByPrefs(headers: string[], prefs: string[] | undefined): string {
  if (!prefs) return ''
  for (const pref of prefs) {
    const h = headers.find((x) => x.toLowerCase().includes(pref))
    if (h) return h
  }
  return ''
}

/**
 * Best-effort guess of which header maps to date/amount/kind/payer/currency.
 * Pass a platformId to bias amount/payer toward that platform's export format.
 */
export function guessCsvMapping(headers: string[], platformId?: string): CsvColumnMap {
  const find = (patterns: RegExp[]): string => headers.find((h) => patterns.some((p) => p.test(h))) ?? ''
  const date = find([/date/i, /timestamp/i, /\btime\b/i, /when/i, /created/i])
  const amount =
    findByPrefs(headers, platformId ? PLATFORM_AMOUNT[platformId] : undefined) ||
    find([/amount/i, /gross/i, /\btotal\b/i, /earning/i, /revenue/i, /price/i, /tokens?/i, /value/i, /\bnet\b/i])
  const kind = find([/type/i, /\bkind\b/i, /category/i, /transaction/i, /description/i])
  const payer =
    findByPrefs(headers, platformId ? PLATFORM_PAYER[platformId] : undefined) ||
    find([/payer/i, /\bfan\b/i, /user/i, /buyer/i, /customer/i, /tipper/i, /\bfrom\b/i])
  const currency = find([/currency/i, /\bcurr\b/i])
  return { date, amount, kind: kind || undefined, payer: payer || undefined, currency: currency || undefined }
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

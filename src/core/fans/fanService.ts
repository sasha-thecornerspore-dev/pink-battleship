import type { Database } from '../db/database'
import type { Fan, FanDetail, FanTier, FanTxn } from '@shared/models'
import { netForTransaction } from '../pnl/rateEngine'

const WHALE_NET = 500
const VIP_NET = 100
const LAPSED_DAYS = 14

function tierFor(net: number): FanTier {
  if (net >= WHALE_NET) return 'whale'
  if (net >= VIP_NET) return 'vip'
  return 'regular'
}

const round = (x: number): number => Math.round(x * 100) / 100

/**
 * The fan rolodex: aggregates transactions per payer (per platform) into spend
 * totals, tiers (whale / VIP / regular), and last-seen, ranked by net. Notes are
 * stored locally in settings (`note:<platform>:<payer>`).
 */
export class FanService {
  constructor(private readonly db: Database) {}

  list(): Fan[] {
    const txs = this.db.queryTransactions()
    const rules = this.db.listRateRules()
    const agg = new Map<
      string,
      { platformId: string; payerRef: string; gross: number; net: number; count: number; lastSeen: string }
    >()

    for (const tx of txs) {
      if (!tx.payerRef) continue
      const id = `${tx.platformId}:${tx.payerRef}`
      const cur = agg.get(id) ?? { platformId: tx.platformId, payerRef: tx.payerRef, gross: 0, net: 0, count: 0, lastSeen: '' }
      cur.gross += tx.grossAmount
      cur.net += netForTransaction(tx, rules)
      cur.count += 1
      if (tx.occurredAt > cur.lastSeen) cur.lastSeen = tx.occurredAt
      agg.set(id, cur)
    }

    const base = [...agg.entries()].map(([id, v]) => ({
      id,
      platformId: v.platformId,
      payerRef: v.payerRef,
      totalGross: round(v.gross),
      totalNet: round(v.net),
      txCount: v.count,
      lastSeen: v.lastSeen,
      tier: tierFor(v.net),
      note: this.db.getSetting(`note:${id}`) ?? '',
    }))
    const latestMs = base.reduce((m, f) => Math.max(m, Date.parse(f.lastSeen) || 0), 0)
    return base
      .map((f) => {
        const days = latestMs ? Math.max(0, Math.round((latestMs - (Date.parse(f.lastSeen) || latestMs)) / 86_400_000)) : 0
        return { ...f, daysSinceSeen: days, lapsed: days > LAPSED_DAYS }
      })
      .sort((a, b) => b.totalNet - a.totalNet)
  }

  setNote(fanId: string, note: string): void {
    this.db.setSetting(`note:${fanId}`, note)
  }

  /** Full history for one fan: every transaction (newest first), per-kind net, and first/last seen. */
  detail(fanId: string): FanDetail | null {
    const fan = this.list().find((f) => f.id === fanId)
    if (!fan) return null
    const rules = this.db.listRateRules()
    const i = fanId.indexOf(':')
    const platformId = fanId.slice(0, i)
    const payerRef = fanId.slice(i + 1)

    const byKind: Record<string, number> = {}
    const txns: FanTxn[] = this.db
      .queryTransactions()
      .filter((t) => t.platformId === platformId && t.payerRef === payerRef)
      .map((t) => {
        const net = round(netForTransaction(t, rules))
        byKind[t.kind] = round((byKind[t.kind] ?? 0) + net)
        return { occurredAt: t.occurredAt, grossAmount: t.grossAmount, net, kind: t.kind }
      })
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))

    return {
      fan,
      firstSeen: txns.length ? txns[txns.length - 1].occurredAt : fan.lastSeen,
      lastSeen: txns.length ? txns[0].occurredAt : fan.lastSeen,
      byKind,
      transactions: txns,
    }
  }
}

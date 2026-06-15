import type { Database } from '../db/database'
import type { Fan, FanTier } from '@shared/models'
import { netForTransaction } from '../pnl/rateEngine'

const WHALE_NET = 500
const VIP_NET = 100

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

    return [...agg.entries()]
      .map(([id, v]) => ({
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
      .sort((a, b) => b.totalNet - a.totalNet)
  }

  setNote(fanId: string, note: string): void {
    this.db.setSetting(`note:${fanId}`, note)
  }
}

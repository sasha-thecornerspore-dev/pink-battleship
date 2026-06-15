import type { Database } from '../db/database'
import type { DriverKind, PnlSummary } from '@shared/models'
import { netForTransaction } from './rateEngine'

export interface PnlOptions {
  from?: string
  to?: string
}

const round = (x: number): number => Math.round(x * 100) / 100

export class PnlService {
  constructor(private readonly db: Database) {}

  summary(opts: PnlOptions = {}): PnlSummary {
    const txs = this.db.queryTransactions({ from: opts.from, to: opts.to })
    const rules = this.db.listRateRules()
    const driverByPlatform = new Map<string, DriverKind>(this.db.listConnectors().map((c) => [c.platformId, c.driver]))

    let gross = 0
    let net = 0
    const fans = new Set<string>()
    const byPlatform = new Map<string, { gross: number; net: number }>()
    const daily = new Map<string, number>()

    for (const tx of txs) {
      const n = netForTransaction(tx, rules)
      gross += tx.grossAmount
      net += n
      if (tx.payerRef) fans.add(`${tx.platformId}:${tx.payerRef}`)
      const pb = byPlatform.get(tx.platformId) ?? { gross: 0, net: 0 }
      pb.gross += tx.grossAmount
      pb.net += n
      byPlatform.set(tx.platformId, pb)
      const day = tx.occurredAt.slice(0, 10)
      daily.set(day, (daily.get(day) ?? 0) + n)
    }

    gross = round(gross)
    net = round(net)

    return {
      gross,
      fees: round(gross - net),
      net,
      activeFans: fans.size,
      byPlatform: [...byPlatform.entries()]
        .map(([platformId, v]) => ({
          platformId,
          driver: driverByPlatform.get(platformId) ?? 'manual',
          gross: round(v.gross),
          net: round(v.net),
        }))
        .sort((a, b) => b.net - a.net),
      dailyNet: [...daily.entries()]
        .map(([date, n]) => ({ date, net: round(n) }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }
  }
}

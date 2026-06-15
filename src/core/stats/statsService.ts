import type { Database } from '../db/database'
import type { EarningsPoint, HeatCell, StatsReport, StatsSummary } from '@shared/models'
import { netForTransaction } from '../pnl/rateEngine'

const round = (x: number): number => Math.round(x * 100) / 100
const dayKey = (iso: string): string => iso.slice(0, 10)

function asDate(occurredAt: string): Date {
  return new Date(occurredAt.length <= 10 ? `${occurredAt}T00:00:00Z` : occurredAt)
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * First-party earnings analytics: a filled daily net series with a trailing
 * moving average, and a day-of-week x hour heatmap keyed on NET dollars (not
 * viewers). Computed entirely from the creator's own transactions.
 */
export class StatsService {
  constructor(private readonly db: Database) {}

  report(maWindow = 7): StatsReport {
    const txs = this.db.queryTransactions()
    const rules = this.db.listRateRules()
    const daily = new Map<string, number>()
    const heat = new Map<string, number>()

    for (const tx of txs) {
      const net = netForTransaction(tx, rules)
      const dk = dayKey(tx.occurredAt)
      daily.set(dk, (daily.get(dk) ?? 0) + net)
      const d = asDate(tx.occurredAt)
      const hk = `${d.getUTCDay()}:${d.getUTCHours()}`
      heat.set(hk, (heat.get(hk) ?? 0) + net)
    }

    let series: EarningsPoint[] = []
    const dates = [...daily.keys()].sort()
    if (dates.length > 0) {
      const filled: { date: string; net: number }[] = []
      let cur = dates[0]
      const last = dates[dates.length - 1]
      while (cur <= last) {
        filled.push({ date: cur, net: round(daily.get(cur) ?? 0) })
        cur = addDays(cur, 1)
      }
      series = filled.map((p, i) => {
        const slice = filled.slice(Math.max(0, i - maWindow + 1), i + 1)
        const ma = slice.reduce((s, x) => s + x.net, 0) / slice.length
        return { date: p.date, net: p.net, ma: round(ma) }
      })
    }

    const heatmap: HeatCell[] = [...heat.entries()].map(([k, net]) => {
      const [dow, hour] = k.split(':').map(Number)
      return { dow, hour, net: round(net) }
    })

    return { series, heatmap, summary: this.buildSummary(daily, heatmap) }
  }

  private buildSummary(daily: Map<string, number>, heatmap: HeatCell[]): StatsSummary {
    const days = [...daily.entries()]
    const totalNet = round(days.reduce((s, [, n]) => s + n, 0))
    const activeDays = days.length

    let bestDay: StatsSummary['bestDay'] = null
    for (const [date, net] of days) {
      if (!bestDay || net > bestDay.net) bestDay = { date, net: round(net) }
    }
    let bestHour: StatsSummary['bestHour'] = null
    for (const c of heatmap) {
      if (!bestHour || c.net > bestHour.net) bestHour = { dow: c.dow, hour: c.hour, net: c.net }
    }

    return {
      totalNet,
      activeDays,
      avgPerActiveDay: activeDays ? round(totalNet / activeDays) : 0,
      bestDay,
      bestHour,
    }
  }
}

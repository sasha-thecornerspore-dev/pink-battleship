import type { RateRule, Transaction } from '@shared/models'

type TxLike = Pick<Transaction, 'platformId' | 'grossAmount' | 'occurredAt'>

function ruleCovers(rule: RateRule, occurredAt: string): boolean {
  if (rule.effectiveFrom > occurredAt) return false
  if (rule.effectiveTo !== null && rule.effectiveTo <= occurredAt) return false
  return true
}

/**
 * Net for a transaction: gross minus the platform cut and processor fees whose
 * dated rule window covers occurredAt. Rates are fractions of gross; fixed fees
 * are absolute per-transaction. Rounded to cents.
 */
export function netForTransaction(tx: TxLike, rules: RateRule[]): number {
  let rate = 0
  let fixed = 0
  for (const r of rules) {
    if (r.platformId !== tx.platformId) continue
    if (!ruleCovers(r, tx.occurredAt)) continue
    rate += r.rate
    fixed += r.fixedFee
  }
  const net = tx.grossAmount * (1 - rate) - fixed
  return Math.round(net * 100) / 100
}

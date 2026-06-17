import { describe, it, expect } from 'vitest'
import { parseCsvTransactions, guessCsvMapping, parseCsvHeaders } from './manualCsv'

const csv = `date,amount,type,payer
2026-05-01,12.50,tip,fan_a
2026-05-02,5,ppv,fan_b
bad,row
2026-05-03,"1,200",sub,"whale, the"
`

describe('guessCsvMapping', () => {
  it('maps common header names to roles', () => {
    const m = guessCsvMapping(parseCsvHeaders('Date,Gross Amount,Transaction Type,Fan Username\n2026-05-01,10,tip,x'))
    expect(m).toMatchObject({ date: 'Date', amount: 'Gross Amount', kind: 'Transaction Type', payer: 'Fan Username' })
  })

  it('leaves required fields empty when nothing matches', () => {
    const m = guessCsvMapping(['colA', 'colB'])
    expect(m.date).toBe('')
    expect(m.amount).toBe('')
  })
})

describe('parseCsvTransactions', () => {
  it('maps valid rows and reports bad rows', () => {
    const r = parseCsvTransactions(csv, {
      platformId: 'onlyfans',
      map: { date: 'date', amount: 'amount', kind: 'type', payer: 'payer' },
    })
    expect(r.transactions).toHaveLength(3)
    expect(r.transactions[0]).toMatchObject({
      platformId: 'onlyfans',
      grossAmount: 12.5,
      kind: 'tip',
      payerRef: 'fan_a',
      currency: 'USD',
    })
    expect(r.skipped).toHaveLength(1)
    expect(r.skipped[0].line).toBe(4)
  })

  it('handles quoted fields with commas', () => {
    const r = parseCsvTransactions(csv, {
      platformId: 'onlyfans',
      map: { date: 'date', amount: 'amount', kind: 'type', payer: 'payer' },
    })
    const sub = r.transactions.find((t) => t.kind === 'sub')
    expect(sub?.grossAmount).toBe(1200)
    expect(sub?.payerRef).toBe('whale, the')
  })

  it('falls back to "other" for unknown kinds', () => {
    const r = parseCsvTransactions('date,amount,type\n2026-05-01,9,weird\n', {
      platformId: 'manyvids',
      map: { date: 'date', amount: 'amount', kind: 'type' },
    })
    expect(r.transactions[0].kind).toBe('other')
  })
})

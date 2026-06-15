import type { Database } from '@core/db/database'
import type { RateRule } from '@shared/models'

function rule(id: string, platformId: string, rate: number, note: string): RateRule {
  return {
    id,
    platformId,
    kind: 'platform_cut',
    rate,
    fixedFee: 0,
    effectiveFrom: '2020-01-01',
    effectiveTo: null,
    note,
    isEstimate: true,
  }
}

/** Seed default, clearly-labeled estimate rate rules on first run. Editable in Settings. */
export function seedDefaults(db: Database): void {
  if (db.getSetting('seeded') === '1') return
  const rules: RateRule[] = [
    rule('cb-cut', 'chaturbate', 0.5, 'Chaturbate revenue share (estimate — verify)'),
    rule('of-cut', 'onlyfans', 0.2, 'OnlyFans 20% (estimate — verify)'),
    rule('fs-cut', 'fansly', 0.2, 'Fansly 20% (estimate — verify)'),
    rule('mv-cut', 'manyvids', 0.2, 'ManyVids share (estimate — verify)'),
  ]
  for (const r of rules) db.upsertRateRule(r)
  db.setSetting('seeded', '1')
}

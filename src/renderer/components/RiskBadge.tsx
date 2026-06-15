import type { RiskLabel } from '@shared/models'

const MAP: Record<RiskLabel, { label: string; bg: string; fg: string }> = {
  'official-low': { label: 'Official API · low risk', bg: 'var(--pb-sage-bg)', fg: 'var(--pb-sage-deep)' },
  'manual-none': { label: 'Manual · no automation', bg: 'var(--pb-active-bg)', fg: 'var(--pb-primary-deep)' },
  'unofficial-high': { label: 'Unofficial · ban risk', bg: '#f6dede', fg: '#a3352d' },
}

export default function RiskBadge({ risk }: { risk: RiskLabel }) {
  const m = MAP[risk]
  return (
    <span style={{ fontSize: 11, background: m.bg, color: m.fg, padding: '3px 9px', borderRadius: 20 }}>{m.label}</span>
  )
}

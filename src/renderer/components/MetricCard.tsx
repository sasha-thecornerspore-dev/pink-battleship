export default function MetricCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ background: 'var(--pb-surface)', borderRadius: 10, padding: '11px 13px' }}>
      <div style={{ fontSize: 11, color: 'var(--pb-text-muted)', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 18, color: accent ?? 'var(--pb-text)' }}>{value}</div>
    </div>
  )
}

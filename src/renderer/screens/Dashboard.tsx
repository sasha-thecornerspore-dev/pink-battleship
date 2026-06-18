import { usePnl, useConnectors, useObs, money } from '../lib/api'
import MetricCard from '../components/MetricCard'
import TrustChip from '../components/TrustChip'
import { useUi } from '../store/ui'
import type { ConnectorInfo, PnlSummary } from '@shared/models'

const PLATFORM_LABEL: Record<string, string> = {
  chaturbate: 'Chaturbate',
  onlyfans: 'OnlyFans',
  fansly: 'Fansly',
  manyvids: 'ManyVids',
}
const BAR = ['var(--pb-primary)', 'var(--pb-accent)', 'var(--pb-gold)', 'var(--pb-sage)']

export default function Dashboard() {
  const pnlQ = usePnl()
  const connQ = useConnectors()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 18 }}>Dashboard</div>
        <TrustChip />
      </div>

      <LiveBanner />

      {pnlQ.isLoading || !pnlQ.data ? (
        <p style={{ color: 'var(--pb-text-muted)' }}>Loading…</p>
      ) : pnlQ.data.byPlatform.length === 0 ? (
        <div className="pb-card" style={{ padding: 28, marginTop: 4 }}>
          <div className="pb-serif" style={{ fontSize: 20, marginBottom: 6 }}>No earnings yet</div>
          <p style={{ color: 'var(--pb-text-muted)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            Go to <b>Connectors</b> to pull Chaturbate (demo) data, or <b>Import</b> a CSV from OnlyFans / Fansly /
            ManyVids. Your unified net P&amp;L appears here — every figure computed on this device.
          </p>
        </div>
      ) : (
        <Body s={pnlQ.data} connectors={connQ.data ?? []} />
      )}
    </div>
  )
}

function LiveBanner() {
  const obs = useObs()
  const setRoute = useUi((s) => s.setRoute)
  const d = obs.data
  if (!d?.connected || !d.streaming) return null
  const h = Math.floor(d.streamSeconds / 3600)
  const m = Math.floor((d.streamSeconds % 3600) / 60)
  const sec = d.streamSeconds % 60
  const dur = `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return (
    <button
      onClick={() => setRoute('live')}
      className="pb-card"
      style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, borderColor: 'var(--pb-danger)' }}
    >
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--pb-danger)', flexShrink: 0 }} />
      <b style={{ color: 'var(--pb-danger)', fontSize: 13, flexShrink: 0 }}>LIVE on OBS</b>
      <span style={{ fontSize: 12, color: 'var(--pb-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {dur} · Scene: {d.currentScene || '—'}
        {d.recording ? ' · recording' : ''}
      </span>
      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--pb-primary-deep)', flexShrink: 0 }}>Open Live →</span>
    </button>
  )
}

function Body({ s, connectors }: { s: PnlSummary; connectors: ConnectorInfo[] }) {
  const maxNet = Math.max(...s.byPlatform.map((p) => p.net), 1)
  const healthy = connectors.filter((c) => c.status === 'healthy').length
  const needs = connectors.filter((c) => c.status !== 'healthy').length

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--pb-text-muted)', marginBottom: 2 }}>Net earnings this period</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
        <span className="pb-serif" style={{ fontSize: 34 }}>
          {money(s.net)}
        </span>
        <span style={{ fontSize: 13, color: 'var(--pb-text-muted)' }}>of {money(s.gross)} gross</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        <MetricCard label="Gross" value={money(s.gross)} />
        <MetricCard label="Cuts & fees" value={'−' + money(s.fees)} accent="var(--pb-primary-deep)" />
        <MetricCard label="Net" value={money(s.net)} accent="var(--pb-sage-deep)" />
        <MetricCard label="Active fans" value={String(s.activeFans)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 14 }}>
        <div className="pb-card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 13, marginBottom: 12 }}>Net by platform</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {s.byPlatform.map((p, i) => (
              <div key={p.platformId}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>
                    {PLATFORM_LABEL[p.platformId] ?? p.platformId}{' '}
                    <span style={{ color: 'var(--pb-accent)' }}>· {p.driver === 'official' ? 'live' : 'manual'}</span>
                  </span>
                  <span>{money(p.net)}</span>
                </div>
                <div style={{ height: 7, background: 'var(--pb-track)', borderRadius: 6 }}>
                  <div
                    style={{
                      width: `${Math.max(4, (p.net / maxNet) * 100)}%`,
                      height: 7,
                      background: BAR[i % BAR.length],
                      borderRadius: 6,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pb-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}>Daily net</div>
          <Sparkline points={s.dailyNet.map((d) => d.net)} />
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 11,
              color: 'var(--pb-sage-deep)',
              background: 'var(--pb-sage-bg)',
              padding: '6px 9px',
              borderRadius: 8,
            }}
          >
            {connectors.length === 0 ? 'No connectors yet' : `${healthy} healthy${needs ? ` · ${needs} need sync` : ''}`}
          </div>
        </div>
      </div>
    </div>
  )
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) {
    return (
      <div style={{ height: 80, display: 'grid', placeItems: 'center', color: 'var(--pb-text-muted)', fontSize: 12 }}>
        Not enough data yet
      </div>
    )
  }
  const w = 240
  const h = 80
  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const span = max - min || 1
  const step = w / (points.length - 1)
  const coords = points.map((v, i): [number, number] => [i * step, h - ((v - min) / span) * (h - 8) - 4])
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} ${w},${h} 0,${h}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Daily net earnings trend">
      <polygon points={area} fill="var(--pb-track)" />
      <polyline points={line} fill="none" stroke="var(--pb-primary)" strokeWidth={2.5} />
    </svg>
  )
}

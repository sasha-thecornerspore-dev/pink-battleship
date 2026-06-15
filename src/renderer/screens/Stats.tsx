import { Fragment } from 'react'
import { useStats, money } from '../lib/api'
import type { StatsReport } from '@shared/models'

const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]
const DOW_LABEL: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' }

function hourLabel(h: number): string {
  const ampm = h < 12 ? 'am' : 'pm'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}${ampm}`
}

export default function Stats() {
  const q = useStats()
  const r = q.data

  return (
    <div>
      <div style={{ fontSize: 18, marginBottom: 4 }}>Stats</div>
      <p style={{ color: 'var(--pb-text-muted)', fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
        Earnings over time and your best hours — by <b>net dollars</b>, across every platform. All computed on this
        device.
      </p>

      {!r ? (
        <p style={{ color: 'var(--pb-text-muted)' }}>Loading…</p>
      ) : r.series.length === 0 ? (
        <div className="pb-card" style={{ padding: 24 }}>
          <span style={{ color: 'var(--pb-text-muted)', fontSize: 14 }}>
            No earnings yet — connect a platform or import a CSV.
          </span>
        </div>
      ) : (
        <Body r={r} />
      )}
    </div>
  )
}

function Body({ r }: { r: StatsReport }) {
  const s = r.summary
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <Tile label="Total net" value={money(s.totalNet)} />
        <Tile label="Avg / active day" value={money(s.avgPerActiveDay)} />
        <Tile label="Best day" value={s.bestDay ? money(s.bestDay.net) : '—'} sub={s.bestDay?.date} />
        <Tile
          label="Best hour"
          value={s.bestHour ? hourLabel(s.bestHour.hour) : '—'}
          sub={s.bestHour ? `${DOW_LABEL[s.bestHour.dow]} · ${money(s.bestHour.net)}` : undefined}
        />
      </div>

      <div className="pb-card" style={{ padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ fontSize: 13, marginBottom: 10 }}>
          Net earnings over time <span style={{ color: 'var(--pb-text-muted)' }}>· 7-day average</span>
        </div>
        <Chart series={r.series} />
      </div>

      <div className="pb-card" style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 13, marginBottom: 12 }}>
          Best time to earn <span style={{ color: 'var(--pb-text-muted)' }}>· net by day &amp; hour (UTC)</span>
        </div>
        <Heatmap cells={r.heatmap} />
      </div>
    </div>
  )
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--pb-surface)', borderRadius: 10, padding: '11px 13px' }}>
      <div style={{ fontSize: 11, color: 'var(--pb-text-muted)', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 18 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--pb-text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Chart({ series }: { series: StatsReport['series'] }) {
  const w = 640
  const h = 150
  const pad = 6
  const maxNet = Math.max(...series.map((p) => Math.max(p.net, p.ma)), 1)
  const n = series.length
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * w)
  const y = (v: number) => h - pad - (v / maxNet) * (h - 2 * pad)
  const netLine = series.map((p, i) => `${x(i).toFixed(1)},${y(p.net).toFixed(1)}`).join(' ')
  const maLine = series.map((p, i) => `${x(i).toFixed(1)},${y(p.ma).toFixed(1)}`).join(' ')
  const area = `${netLine} ${w},${h} 0,${h}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Net earnings over time with 7-day moving average">
      <polygon points={area} fill="var(--pb-track)" />
      <polyline points={netLine} fill="none" stroke="var(--pb-accent)" strokeWidth={1.5} opacity={0.7} />
      <polyline points={maLine} fill="none" stroke="var(--pb-primary)" strokeWidth={2.5} />
    </svg>
  )
}

function Heatmap({ cells }: { cells: StatsReport['heatmap'] }) {
  const lookup = new Map(cells.map((c) => [`${c.dow}:${c.hour}`, c.net]))
  const max = Math.max(...cells.map((c) => c.net), 1)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '34px repeat(24, 1fr)', gap: 2 }}>
      {DOW_ORDER.map((dow) => (
        <Fragment key={dow}>
          <div style={{ fontSize: 11, color: 'var(--pb-text-muted)', display: 'flex', alignItems: 'center' }}>
            {DOW_LABEL[dow]}
          </div>
          {Array.from({ length: 24 }, (_, hour) => {
            const net = lookup.get(`${dow}:${hour}`) ?? 0
            const a = net > 0 ? 0.18 + 0.82 * (net / max) : 0
            return (
              <div
                key={hour}
                title={`${DOW_LABEL[dow]} ${hourLabel(hour)}: ${money(net)}`}
                style={{ height: 16, borderRadius: 3, background: net > 0 ? `rgba(201,139,168,${a.toFixed(2)})` : 'var(--pb-track)' }}
              />
            )
          })}
        </Fragment>
      ))}
      <div />
      {[0, 6, 12, 18].map((hh) => (
        <div key={hh} style={{ gridColumn: 'span 6', fontSize: 10, color: 'var(--pb-text-muted)', marginTop: 4 }}>
          {hourLabel(hh)}
        </div>
      ))}
    </div>
  )
}

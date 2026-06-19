import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useFans, pb, qk, money } from '../lib/api'
import type { Fan, FanTier } from '@shared/models'

const PLATFORM_LABEL: Record<string, string> = {
  chaturbate: 'Chaturbate',
  onlyfans: 'OnlyFans',
  fansly: 'Fansly',
  manyvids: 'ManyVids',
}

const TIER: Record<FanTier, { label: string; bg: string; fg: string }> = {
  whale: { label: 'Whale', bg: 'var(--pb-active-bg)', fg: 'var(--pb-primary-deep)' },
  vip: { label: 'VIP', bg: 'var(--pb-sage-bg)', fg: 'var(--pb-sage-deep)' },
  regular: { label: 'Regular', bg: 'var(--pb-track)', fg: 'var(--pb-text-muted)' },
}

export default function Fans() {
  const q = useFans()
  const fans = q.data ?? []
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div>
      <div style={{ fontSize: 18, marginBottom: 4 }}>Fans</div>
      <p style={{ color: 'var(--pb-text-muted)', fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
        Your spenders across every platform, ranked by net. Private notes stay on this device.
      </p>

      {fans.filter((f) => f.lapsed).length > 0 && (
        <div className="pb-card" style={{ padding: '8px 12px', marginBottom: 12, borderColor: 'var(--pb-gold)' }}>
          <span style={{ fontSize: 12, color: 'var(--pb-text-muted)' }}>
            <b style={{ color: 'var(--pb-primary-deep)' }}>{fans.filter((f) => f.lapsed).length}</b> fans haven&apos;t bought
            in a while — consider a win-back DM.
          </span>
        </div>
      )}

      {fans.length === 0 ? (
        <div className="pb-card" style={{ padding: 24 }}>
          <span style={{ color: 'var(--pb-text-muted)', fontSize: 14 }}>
            No fan data yet — connect Chaturbate or import a CSV with a payer column.
          </span>
        </div>
      ) : (
        <div className="pb-card" style={{ padding: 0, overflow: 'hidden' }}>
          {fans.map((f) => (
            <div key={f.id}>
              <FanRow fan={f} expanded={expandedId === f.id} onToggle={() => setExpandedId(expandedId === f.id ? null : f.id)} />
              {expandedId === f.id && <FanDetailPanel fanId={f.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FanRow({ fan, expanded, onToggle }: { fan: Fan; expanded: boolean; onToggle: () => void }) {
  const qc = useQueryClient()
  const [note, setNote] = useState(fan.note)
  const t = TIER[fan.tier]

  const saveNote = async () => {
    if (note === fan.note) return
    await pb.fans.setNote(fan.id, note)
    await qc.invalidateQueries({ queryKey: qk.fans })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--pb-border)' }}>
      <div
        onClick={onToggle}
        title={expanded ? 'Hide history' : 'Show history'}
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'var(--pb-active-bg)',
          color: 'var(--pb-primary-deep)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: 13,
          flexShrink: 0,
          cursor: 'pointer',
        }}
      >
        {fan.payerRef.slice(0, 2).toUpperCase()}
      </div>
      <div style={{ width: 150, flexShrink: 0, cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 10, color: 'var(--pb-text-muted)', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .1s' }}>▶</span>
          {fan.payerRef}
        </div>
        <div style={{ fontSize: 11, color: 'var(--pb-text-muted)' }}>
          {PLATFORM_LABEL[fan.platformId] ?? fan.platformId} · {fan.txCount} purchase{fan.txCount === 1 ? '' : 's'}
        </div>
      </div>
      <span style={{ fontSize: 11, background: t.bg, color: t.fg, padding: '3px 9px', borderRadius: 20, flexShrink: 0 }}>
        {t.label}
      </span>
      {fan.lapsed && (
        <span style={{ fontSize: 11, background: '#f6ecd6', color: '#8a6a1a', padding: '3px 9px', borderRadius: 20, flexShrink: 0 }}>
          lapsed {fan.daysSinceSeen}d
        </span>
      )}
      <input
        className="pb-input"
        placeholder="Add a note…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={saveNote}
        style={{ flex: 1, minWidth: 0 }}
      />
      <div style={{ width: 90, textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 14, color: 'var(--pb-sage-deep)' }}>{money(fan.totalNet)}</div>
        <div style={{ fontSize: 11, color: 'var(--pb-text-muted)' }}>net</div>
      </div>
    </div>
  )
}

const fmtDate = (s: string) => {
  const d = new Date(s)
  return isNaN(d.getTime()) ? s : d.toLocaleDateString()
}

function FanDetailPanel({ fanId }: { fanId: string }) {
  const q = useQuery({ queryKey: [...qk.fans, 'detail', fanId], queryFn: () => pb.fans.detail(fanId) })
  const d = q.data
  if (!d) {
    return <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--pb-text-muted)', background: 'var(--pb-surface-2)', borderBottom: '1px solid var(--pb-border)' }}>Loading…</div>
  }
  const chrono = [...d.transactions].reverse() // oldest → newest for the trend
  const maxNet = Math.max(...chrono.map((t) => t.net), 1)
  return (
    <div style={{ padding: '12px 16px 16px 62px', background: 'var(--pb-surface-2)', borderBottom: '1px solid var(--pb-border)' }}>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 12, fontSize: 12, color: 'var(--pb-text-muted)' }}>
        <span>First seen <b style={{ color: 'var(--pb-text)' }}>{fmtDate(d.firstSeen)}</b></span>
        <span>Last seen <b style={{ color: 'var(--pb-text)' }}>{fmtDate(d.lastSeen)}</b></span>
        <span>{d.transactions.length} purchases</span>
        {Object.entries(d.byKind).map(([k, v]) => (
          <span key={k} style={{ background: 'var(--pb-track)', borderRadius: 12, padding: '1px 8px' }}>
            {k}: <b style={{ color: 'var(--pb-sage-deep)' }}>{money(v)}</b>
          </span>
        ))}
      </div>

      {/* spend trend — net per purchase, oldest → newest */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40, marginBottom: 12 }}>
        {chrono.map((t, i) => (
          <div
            key={i}
            title={`${fmtDate(t.occurredAt)} · ${money(t.net)} (${t.kind})`}
            style={{ width: 10, height: `${Math.max(8, (t.net / maxNet) * 100)}%`, background: 'var(--pb-primary)', borderRadius: 2 }}
          />
        ))}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, maxWidth: 460 }}>
        <thead>
          <tr style={{ color: 'var(--pb-text-muted)', textAlign: 'left' }}>
            <th style={dth}>Date</th>
            <th style={dth}>Type</th>
            <th style={{ ...dth, textAlign: 'right' }}>Gross</th>
            <th style={{ ...dth, textAlign: 'right' }}>Net</th>
          </tr>
        </thead>
        <tbody>
          {d.transactions.slice(0, 8).map((t, i) => (
            <tr key={i}>
              <td style={dtd}>{fmtDate(t.occurredAt)}</td>
              <td style={dtd}>{t.kind}</td>
              <td style={{ ...dtd, textAlign: 'right' }}>{money(t.grossAmount)}</td>
              <td style={{ ...dtd, textAlign: 'right', color: 'var(--pb-sage-deep)' }}>{money(t.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {d.transactions.length > 8 && (
        <div style={{ fontSize: 11, color: 'var(--pb-text-muted)', marginTop: 6 }}>and {d.transactions.length - 8} more…</div>
      )}
    </div>
  )
}

const dth: React.CSSProperties = { padding: '2px 10px 6px 0', fontWeight: 500, borderBottom: '1px solid var(--pb-border)' }
const dtd: React.CSSProperties = { padding: '4px 10px 4px 0', borderBottom: '1px solid var(--pb-border)' }

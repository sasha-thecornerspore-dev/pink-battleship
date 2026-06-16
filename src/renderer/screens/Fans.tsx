import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
            <FanRow key={f.id} fan={f} />
          ))}
        </div>
      )}
    </div>
  )
}

function FanRow({ fan }: { fan: Fan }) {
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
        }}
      >
        {fan.payerRef.slice(0, 2).toUpperCase()}
      </div>
      <div style={{ width: 150, flexShrink: 0 }}>
        <div style={{ fontSize: 14 }}>{fan.payerRef}</div>
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

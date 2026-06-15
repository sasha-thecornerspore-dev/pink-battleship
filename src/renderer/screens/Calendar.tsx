import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { pb, qk } from '../lib/api'
import type { ScheduledItem, ScheduleKind, ScheduleStatus } from '@shared/models'

const PLATFORMS = [
  { id: 'chaturbate', label: 'Chaturbate' },
  { id: 'onlyfans', label: 'OnlyFans' },
  { id: 'fansly', label: 'Fansly' },
  { id: 'manyvids', label: 'ManyVids' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'x', label: 'X' },
]
const PLATFORM_LABEL: Record<string, string> = Object.fromEntries(PLATFORMS.map((p) => [p.id, p.label]))

const KINDS: { id: ScheduleKind; label: string }[] = [
  { id: 'post', label: 'Post' },
  { id: 'mass_dm', label: 'Mass DM' },
  { id: 'go_live', label: 'Go live' },
  { id: 'promo', label: 'Promo' },
]
const KIND_LABEL: Record<string, string> = Object.fromEntries(KINDS.map((k) => [k.id, k.label]))

const STATUS: Record<ScheduleStatus, { bg: string; fg: string; label: string }> = {
  planned: { bg: 'var(--pb-active-bg)', fg: 'var(--pb-primary-deep)', label: 'Planned' },
  posted: { bg: 'var(--pb-sage-bg)', fg: 'var(--pb-sage-deep)', label: 'Posted' },
  skipped: { bg: 'var(--pb-track)', fg: 'var(--pb-text-muted)', label: 'Skipped' },
}

export default function Calendar() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: qk.schedule, queryFn: () => pb.schedule.list() })
  const items = q.data ?? []

  const [platformId, setPlatformId] = useState('onlyfans')
  const [kind, setKind] = useState<ScheduleKind>('post')
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState('')

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.schedule })
  const add = async () => {
    if (!title.trim() || !when) return
    await pb.schedule.create({ platformId, kind, title: title.trim(), caption: '', scheduledAt: when })
    setTitle('')
    setWhen('')
    await invalidate()
  }
  const setStatus = async (id: string, s: ScheduleStatus) => {
    await pb.schedule.setStatus(id, s)
    await invalidate()
  }
  const remove = async (id: string) => {
    await pb.schedule.remove(id)
    await invalidate()
  }

  const groups = new Map<string, ScheduledItem[]>()
  for (const it of items) {
    const d = it.scheduledAt.slice(0, 10)
    const arr = groups.get(d) ?? []
    arr.push(it)
    groups.set(d, arr)
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ fontSize: 18, marginBottom: 4 }}>Calendar</div>
      <p style={{ color: 'var(--pb-text-muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
        Plan posts, mass-DMs, go-lives and promo across platforms. No-API platforms become a copy-and-post reminder;
        official ones can auto-post later.
      </p>

      <div className="pb-card" style={{ padding: 14, marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="pb-input" style={{ width: 130 }} value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
          {PLATFORMS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select className="pb-input" style={{ width: 110 }} value={kind} onChange={(e) => setKind(e.target.value as ScheduleKind)}>
          {KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
        <input className="pb-input" style={{ flex: 1, minWidth: 140 }} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="pb-input" type="datetime-local" style={{ width: 200 }} value={when} onChange={(e) => setWhen(e.target.value)} />
        <button className="pb-btn pb-btn-primary" onClick={add} disabled={!title.trim() || !when}>
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <div className="pb-card" style={{ padding: 20 }}>
          <span style={{ color: 'var(--pb-text-muted)', fontSize: 13 }}>Nothing scheduled yet.</span>
        </div>
      ) : (
        [...groups.entries()].map(([date, its]) => (
          <div key={date} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--pb-text-muted)', marginBottom: 6 }}>
              {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <div className="pb-card" style={{ padding: 0, overflow: 'hidden' }}>
              {its.map((it) => (
                <Row key={it.id} item={it} onStatus={setStatus} onRemove={remove} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function Row({
  item,
  onStatus,
  onRemove,
}: {
  item: ScheduledItem
  onStatus: (id: string, s: ScheduleStatus) => void
  onRemove: (id: string) => void
}) {
  const sc = STATUS[item.status]
  const time = new Date(item.scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: '1px solid var(--pb-border)' }}>
      <span style={{ fontSize: 12, color: 'var(--pb-text-muted)', width: 70, flexShrink: 0 }}>{time}</span>
      <span style={{ fontSize: 11, background: 'var(--pb-track)', color: 'var(--pb-text-muted)', padding: '2px 8px', borderRadius: 10, flexShrink: 0 }}>
        {PLATFORM_LABEL[item.platformId] ?? item.platformId}
      </span>
      <span style={{ fontSize: 11, color: 'var(--pb-accent)', flexShrink: 0 }}>{KIND_LABEL[item.kind]}</span>
      <span style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
      <span style={{ fontSize: 11, background: sc.bg, color: sc.fg, padding: '2px 8px', borderRadius: 10, flexShrink: 0 }}>{sc.label}</span>
      {item.status === 'planned' && (
        <>
          <button className="pb-btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => onStatus(item.id, 'posted')}>
            Posted
          </button>
          <button className="pb-btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => onStatus(item.id, 'skipped')}>
            Skip
          </button>
        </>
      )}
      <button
        className="pb-btn"
        style={{ fontSize: 11, padding: '4px 8px', borderColor: 'var(--pb-danger)', color: 'var(--pb-danger)' }}
        onClick={() => onRemove(item.id)}
        aria-label="Delete"
      >
        ✕
      </button>
    </div>
  )
}

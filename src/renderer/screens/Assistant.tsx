import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { pb, qk } from '../lib/api'
import type { AssistantTask, DraftResult } from '@shared/models'

const TASKS: { id: AssistantTask; label: string }[] = [
  { id: 'caption', label: 'Caption' },
  { id: 'fan_reply', label: 'Fan reply' },
  { id: 'content_idea', label: 'Content idea' },
]

export default function Assistant() {
  const qc = useQueryClient()
  const cfg = useQuery({ queryKey: qk.assistant, queryFn: () => pb.assistant.config() })
  const [task, setTask] = useState<AssistantTask>('caption')
  const [context, setContext] = useState('')
  const [persona, setPersona] = useState('')
  const [explicit, setExplicit] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<DraftResult | null>(null)
  const [newBoundary, setNewBoundary] = useState('')

  const boundaries = cfg.data?.boundaries ?? []
  const providers = cfg.data?.providers ?? []
  const available = new Set(cfg.data?.available ?? [])

  const draft = async () => {
    setBusy(true)
    try {
      setResult(await pb.assistant.draft({ task, context, explicit, persona: persona || undefined }))
    } finally {
      setBusy(false)
    }
  }
  const addBoundary = async () => {
    const t = newBoundary.trim()
    if (!t || boundaries.includes(t)) return
    await pb.assistant.setBoundaries([...boundaries, t])
    setNewBoundary('')
    await qc.invalidateQueries({ queryKey: qk.assistant })
  }
  const removeBoundary = async (b: string) => {
    await pb.assistant.setBoundaries(boundaries.filter((x) => x !== b))
    await qc.invalidateQueries({ queryKey: qk.assistant })
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ fontSize: 18, marginBottom: 4 }}>Assistant</div>
      <p style={{ color: 'var(--pb-text-muted)', fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
        Draft captions, fan replies, and content ideas. A free local baseline runs by default; explicit work never
        touches SFW providers, fan PII is forced to a local backend, and your boundaries are enforced on every model.
      </p>

      <div className="pb-card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          {TASKS.map((t) => (
            <button key={t.id} className={task === t.id ? 'pb-btn pb-btn-primary' : 'pb-btn'} onClick={() => setTask(t.id)}>
              {t.label}
            </button>
          ))}
          <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--pb-text-muted)' }}>
            <input type="checkbox" checked={explicit} onChange={(e) => setExplicit(e.target.checked)} /> Explicit
          </label>
        </div>
        <textarea
          className="pb-input"
          placeholder="What's this about? e.g. new lingerie set, blue, Friday drop"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          style={{ minHeight: 72, marginBottom: 10 }}
        />
        <input
          className="pb-input"
          placeholder="Persona / voice (optional) — e.g. playful, dominant"
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <button className="pb-btn pb-btn-primary" onClick={draft} disabled={busy || !context.trim()}>
          {busy ? 'Drafting…' : 'Draft'}
        </button>
      </div>

      {result &&
        (result.ok ? (
          <div className="pb-card" style={{ padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--pb-sage-deep)', background: 'var(--pb-sage-bg)', padding: '3px 9px', borderRadius: 20 }}>
                Routed via {result.routeLabel}
              </span>
              <button className="pb-btn" style={{ fontSize: 12 }} onClick={() => result.text && navigator.clipboard?.writeText(result.text)}>
                Copy
              </button>
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 10 }}>{result.text}</div>
            {result.notes.map((n, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--pb-text-muted)', marginTop: 2 }}>
                · {n}
              </div>
            ))}
          </div>
        ) : (
          <div className="pb-card" style={{ padding: 16, marginBottom: 14, borderColor: 'var(--pb-danger)' }}>
            <div style={{ color: 'var(--pb-danger)', fontSize: 14, marginBottom: 4 }}>Blocked</div>
            <div style={{ fontSize: 13 }}>{result.blocked}</div>
          </div>
        ))}

      <div className="pb-card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 14, marginBottom: 3 }}>Your boundaries</div>
        <p style={{ fontSize: 12, color: 'var(--pb-text-muted)', margin: '0 0 10px' }}>
          Acts or words you won't roleplay. Enforced on every backend, including local.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {boundaries.length === 0 ? (
            <span style={{ fontSize: 12, color: 'var(--pb-text-muted)' }}>None yet.</span>
          ) : (
            boundaries.map((b) => (
              <span
                key={b}
                style={{ fontSize: 12, background: 'var(--pb-active-bg)', color: 'var(--pb-primary-deep)', padding: '3px 6px 3px 10px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {b}
                <button onClick={() => removeBoundary(b)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--pb-primary-deep)', fontSize: 14, lineHeight: 1 }} aria-label={`Remove ${b}`}>
                  ×
                </button>
              </span>
            ))
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="pb-input"
            placeholder="Add a boundary…"
            value={newBoundary}
            onChange={(e) => setNewBoundary(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addBoundary()}
          />
          <button className="pb-btn" onClick={addBoundary}>
            Add
          </button>
        </div>
      </div>

      <div className="pb-card" style={{ padding: 16 }}>
        <div style={{ fontSize: 14, marginBottom: 8 }}>Backends</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {providers.map((p) => {
            const on = available.has(p.id)
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: on ? 'var(--pb-sage)' : 'var(--pb-track)' }} />
                <span style={{ color: on ? 'var(--pb-text)' : 'var(--pb-text-muted)' }}>{p.label}</span>
                <span style={{ fontSize: 11, color: 'var(--pb-text-muted)' }}>
                  {p.explicitOk ? 'explicit-ok' : 'SFW-only'}
                  {p.local ? ' · local' : ''}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: on ? 'var(--pb-sage-deep)' : 'var(--pb-text-muted)' }}>
                  {on ? 'available' : 'add key in Settings'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

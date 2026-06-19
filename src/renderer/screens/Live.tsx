import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useObs, pb, qk } from '../lib/api'
import ExternalLink from '../components/ExternalLink'
import { LINKS } from '../lib/links'

function duration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function Pill({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 13,
        padding: '5px 12px',
        borderRadius: 20,
        background: on ? 'var(--pb-sage-bg)' : 'var(--pb-track)',
        color: on ? 'var(--pb-sage-deep)' : 'var(--pb-text-muted)',
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: on ? 'var(--pb-sage)' : 'var(--pb-text-muted)' }} />
      {label}
    </span>
  )
}

export default function Live() {
  const q = useObs()
  const qc = useQueryClient()
  const [address, setAddress] = useState('ws://127.0.0.1:4455')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const nextLive = useQuery({
    queryKey: qk.schedule,
    queryFn: () => pb.schedule.list(),
    select: (items) =>
      items
        .filter((i) => i.kind === 'go_live' && i.status === 'planned' && i.scheduledAt >= new Date().toISOString())
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0],
  })

  const obs = q.data
  const connected = obs?.connected ?? false

  const connect = async () => {
    setBusy(true)
    try {
      await pb.obs.connect(address, password)
      setPassword('')
      await qc.invalidateQueries({ queryKey: qk.obs })
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    setBusy(true)
    try {
      await pb.obs.disconnect()
      await qc.invalidateQueries({ queryKey: qk.obs })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div style={{ fontSize: 18, marginBottom: 4 }}>Live (OBS)</div>
      <p style={{ color: 'var(--pb-text-muted)', fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
        Reads OBS Studio over its local WebSocket (127.0.0.1) — stays on your machine, never touches the network. See your
        stream at a glance without alt-tabbing out of a show.
      </p>

      {connected && obs ? (
        <>
          <div className="pb-card" style={{ padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  color: obs.streaming ? 'var(--pb-danger)' : 'var(--pb-text-muted)',
                }}
              >
                {obs.streaming ? '● LIVE' : '○ OFFLINE'}
              </span>
              {obs.streaming && <span style={{ fontSize: 15, color: 'var(--pb-text-muted)' }}>{duration(obs.streamSeconds)}</span>}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Pill on={obs.streaming} label={obs.streaming ? 'Streaming' : 'Not streaming'} />
              <Pill on={obs.recording} label={obs.recording ? 'Recording' : 'Not recording'} />
              <span style={{ fontSize: 13, padding: '5px 12px', borderRadius: 20, background: 'var(--pb-active-bg)', color: 'var(--pb-primary-deep)' }}>
                Scene · {obs.currentScene || '—'}
              </span>
            </div>
          </div>

          <div className="pb-card" style={{ padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 14, marginBottom: 10 }}>Scenes</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {obs.scenes.map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: 12,
                    padding: '5px 11px',
                    borderRadius: 8,
                    background: s === obs.currentScene ? 'var(--pb-primary)' : 'var(--pb-track)',
                    color: s === obs.currentScene ? '#fff' : 'var(--pb-text-muted)',
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {nextLive.data && (
            <div className="pb-card" style={{ padding: '12px 16px', marginBottom: 14, borderColor: 'var(--pb-sage)' }}>
              <span style={{ fontSize: 13, color: 'var(--pb-text-muted)' }}>
                Next scheduled go-live: <b style={{ color: 'var(--pb-text)' }}>{nextLive.data.title}</b> ·{' '}
                {new Date(nextLive.data.scheduledAt).toLocaleString()}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="pb-btn" onClick={() => qc.invalidateQueries({ queryKey: qk.obs })}>
              Refresh
            </button>
            <button className="pb-btn" onClick={disconnect} disabled={busy} style={{ borderColor: 'var(--pb-danger)', color: 'var(--pb-danger)' }}>
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="pb-card" style={{ padding: '16px 18px', marginBottom: 14 }}>
            <div style={{ fontSize: 14, marginBottom: 4 }}>Connect to OBS</div>
            <div style={{ fontSize: 12, color: 'var(--pb-text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
              In OBS: <b>Tools → WebSocket Server Settings → Enable</b>. Copy the port (default 4455) and, if you set one, the
              password. The password is stored in your OS keychain.{' '}
              <ExternalLink href={LINKS.obsDownload} style={{ fontSize: 12 }}>Get OBS ↗</ExternalLink>
              {' · '}
              <ExternalLink href={LINKS.obsWebsocket} style={{ fontSize: 12 }}>WebSocket docs ↗</ExternalLink>
            </div>
            <div style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
              <input className="pb-input" placeholder="ws://127.0.0.1:4455" value={address} onChange={(e) => setAddress(e.target.value)} />
              <input className="pb-input" type="password" placeholder="WebSocket password (if set)" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button className="pb-btn pb-btn-primary" onClick={connect} disabled={busy}>
                {busy ? 'Connecting…' : 'Connect'}
              </button>
            </div>
            {obs?.error && <div style={{ marginTop: 12, color: 'var(--pb-danger)', fontSize: 13 }}>{obs.error}</div>}
          </div>
        </>
      )}
    </div>
  )
}

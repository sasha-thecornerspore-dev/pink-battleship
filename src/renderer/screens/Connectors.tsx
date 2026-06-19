import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useConnectors, pb, qk } from '../lib/api'
import RiskBadge from '../components/RiskBadge'
import ExternalLink from '../components/ExternalLink'
import { LINKS } from '../lib/links'
import { useUi } from '../store/ui'
import type { ConnectorInfo } from '@shared/models'

const PLATFORM_LABEL: Record<string, string> = {
  chaturbate: 'Chaturbate',
  onlyfans: 'OnlyFans',
  fansly: 'Fansly',
  manyvids: 'ManyVids',
}

const STATUS_LABEL: Record<ConnectorInfo['status'], string> = {
  healthy: 'Healthy',
  needs_sync: 'Needs sync',
  broken: 'Broken',
}

export default function Connectors() {
  const q = useConnectors()
  const qc = useQueryClient()
  const setRoute = useUi((s) => s.setRoute)
  const [busy, setBusy] = useState<string | null>(null)
  const [liveUrl, setLiveUrl] = useState('')

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: qk.connectors })
    await qc.invalidateQueries({ queryKey: qk.pnl })
  }

  const connectChaturbate = async () => {
    setBusy('connect')
    try {
      const info = await pb.connectors.connectChaturbateMock()
      await pb.connectors.sync(info.id)
      await invalidate()
    } finally {
      setBusy(null)
    }
  }

  const sync = async (id: string) => {
    setBusy(id)
    try {
      await pb.connectors.sync(id)
      await invalidate()
    } finally {
      setBusy(null)
    }
  }

  const connectLive = async () => {
    setBusy('live')
    try {
      await pb.connectors.connectChaturbate(liveUrl)
      try {
        await pb.connectors.sync('chaturbate')
      } catch {
        // invalid URL/token -> connector is marked broken and shown in the list
      }
      setLiveUrl('')
      await invalidate()
    } finally {
      setBusy(null)
    }
  }

  const disconnect = async (id: string) => {
    setBusy(id)
    try {
      await pb.connectors.disconnect(id)
      await invalidate()
    } finally {
      setBusy(null)
    }
  }

  const list = q.data ?? []
  const hasChaturbate = list.some((c) => c.platformId === 'chaturbate')

  return (
    <div>
      <div style={{ fontSize: 18, marginBottom: 4 }}>Connectors</div>
      <p style={{ color: 'var(--pb-text-muted)', fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
        Official APIs pull automatically. Platforms without an API (OnlyFans, Fansly, ManyVids) use manual import — no
        automation, no ban risk.
      </p>

      {!hasChaturbate && (
        <div className="pb-card" style={{ padding: '14px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, marginBottom: 3 }}>Chaturbate</div>
            <div style={{ fontSize: 12, color: 'var(--pb-text-muted)' }}>Official Events API · demo data</div>
          </div>
          <button className="pb-btn pb-btn-primary" onClick={connectChaturbate} disabled={busy === 'connect'}>
            {busy === 'connect' ? 'Connecting…' : 'Connect (demo)'}
          </button>
        </div>
      )}

      {!hasChaturbate && (
        <div className="pb-card" style={{ padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 14, marginBottom: 4 }}>Chaturbate — live</div>
          <div style={{ fontSize: 12, color: 'var(--pb-text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
            Paste your Events API URL (Chaturbate → Apps &amp; Bots → Events API). It's stored in your OS keychain, and only
            this one host is ever contacted.{' '}
            <ExternalLink href={LINKS.chaturbateApps} style={{ fontSize: 12 }}>
              Where do I find this? ↗
            </ExternalLink>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="pb-input"
              placeholder="https://eventsapi.chaturbate.com/events/<user>/<token>/"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
            />
            <button
              className="pb-btn pb-btn-primary"
              onClick={connectLive}
              disabled={busy === 'live' || !liveUrl.includes('eventsapi.chaturbate.com')}
            >
              {busy === 'live' ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </div>
      )}

      {list.map((c) => (
        <div
          key={c.id}
          className="pb-card"
          style={{ padding: '14px 16px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <div style={{ fontSize: 14, marginBottom: 5 }}>{PLATFORM_LABEL[c.platformId] ?? c.platformId}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RiskBadge risk={c.riskLabel} />
              <span style={{ fontSize: 12, color: 'var(--pb-text-muted)' }}>
                {STATUS_LABEL[c.status]}
                {c.lastSyncAt ? ` · ${new Date(c.lastSyncAt).toLocaleDateString()}` : ''}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {c.driver === 'official' ? (
              <button className="pb-btn" onClick={() => sync(c.id)} disabled={busy === c.id}>
                {busy === c.id ? 'Syncing…' : 'Sync'}
              </button>
            ) : (
              <button className="pb-btn" onClick={() => setRoute('import')}>
                Import CSV
              </button>
            )}
            <button
              className="pb-btn"
              onClick={() => disconnect(c.id)}
              disabled={busy === c.id}
              style={{ borderColor: 'var(--pb-danger)', color: 'var(--pb-danger)' }}
            >
              Disconnect
            </button>
          </div>
        </div>
      ))}

      <div className="pb-card" style={{ padding: '14px 16px', marginTop: 6, borderColor: 'var(--pb-sage)' }}>
        <div style={{ fontSize: 14, marginBottom: 6 }}>Account safety</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--pb-text-muted)', lineHeight: 1.7 }}>
          <li>OnlyFans, Fansly &amp; ManyVids are <b>import-only</b> here — no automation, so nothing on your account looks botted.</li>
          <li>Chaturbate uses the <b>official</b> Events API; your token lives in the OS keychain and only <code>eventsapi.chaturbate.com</code> is ever contacted.</li>
          <li>Never paste a platform <b>password</b> — only the Chaturbate Events URL. Disconnecting wipes the stored token.</li>
        </ul>
      </div>
    </div>
  )
}

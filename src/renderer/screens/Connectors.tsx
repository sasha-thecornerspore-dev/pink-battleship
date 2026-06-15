import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useConnectors, pb, qk } from '../lib/api'
import RiskBadge from '../components/RiskBadge'
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

  const list = q.data ?? []
  const hasChaturbate = list.some((c) => c.id === 'chaturbate-mock')

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
          {c.driver === 'official' ? (
            <button className="pb-btn" onClick={() => sync(c.id)} disabled={busy === c.id}>
              {busy === c.id ? 'Syncing…' : 'Sync'}
            </button>
          ) : (
            <button className="pb-btn" onClick={() => setRoute('import')}>
              Import CSV
            </button>
          )}
        </div>
      ))}

      {list.length === 0 && hasChaturbate === false && null}
    </div>
  )
}

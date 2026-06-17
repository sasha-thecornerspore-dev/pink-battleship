import { useQueryClient } from '@tanstack/react-query'
import { useUi, type Route } from '../store/ui'
import { pb, qk } from '../lib/api'

const NAV: { id: Route; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'stats', label: 'Stats' },
  { id: 'fans', label: 'Fans' },
  { id: 'galleries', label: 'Galleries' },
  { id: 'assistant', label: 'Assistant' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'live', label: 'Live (OBS)' },
  { id: 'connectors', label: 'Connectors' },
  { id: 'import', label: 'Import' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'settings', label: 'Settings' },
]

export default function Sidebar() {
  const route = useUi((s) => s.route)
  const setRoute = useUi((s) => s.setRoute)
  const setTourOpen = useUi((s) => s.setTourOpen)
  const qc = useQueryClient()

  const lock = async () => {
    await pb.vault.lock()
    await qc.invalidateQueries({ queryKey: qk.vaultStatus })
  }

  return (
    <aside
      style={{
        width: 188,
        background: 'var(--pb-sidebar)',
        padding: '18px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 8px 16px' }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 9,
            background: 'var(--pb-primary)',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
          }}
        >
          P
        </span>
        <span className="pb-serif" style={{ fontSize: 17, color: 'var(--pb-primary-deep)' }}>
          Pink Battleship
        </span>
      </div>

      {NAV.map((n) => {
        const active = route === n.id
        return (
          <button
            key={n.id}
            onClick={() => setRoute(n.id)}
            style={{
              textAlign: 'left',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 8,
              padding: '9px 11px',
              fontSize: 13,
              background: active ? 'var(--pb-active-bg)' : 'transparent',
              color: active ? 'var(--pb-primary-deep)' : 'var(--pb-text-muted)',
            }}
          >
            {n.label}
          </button>
        )
      })}

      <div style={{ flex: 1 }} />
      <button className="pb-btn" onClick={() => setTourOpen(true)} style={{ marginBottom: 8, fontSize: 12 }}>
        Take a tour
      </button>
      <button
        className="pb-btn"
        onClick={lock}
        style={{ marginBottom: 8, fontSize: 12 }}
        title="Lock the vault now"
      >
        Lock vault
      </button>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderRadius: 8,
          background: 'var(--pb-sage-bg)',
          color: 'var(--pb-sage-deep)',
          fontSize: 12,
        }}
      >
        All local · vault open
      </div>
    </aside>
  )
}

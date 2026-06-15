import { useState, type CSSProperties } from 'react'

type Route = 'dashboard' | 'connectors' | 'import' | 'settings'

const NAV: { id: Route; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'connectors', label: 'Connectors' },
  { id: 'import', label: 'Import' },
  { id: 'settings', label: 'Settings' },
]

const FUTURE = ['Galleries', 'Assistant', 'Calendar', 'Compliance']

export default function App() {
  const [route, setRoute] = useState<Route>('dashboard')

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
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
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            P
          </span>
          <span className="pb-serif" style={{ fontSize: 17, color: 'var(--pb-primary-deep)' }}>
            Pink Battleship
          </span>
        </div>

        {NAV.map((n) => (
          <button key={n.id} onClick={() => setRoute(n.id)} style={navStyle(route === n.id)}>
            {n.label}
          </button>
        ))}

        <div
          style={{
            marginTop: 14,
            padding: '4px 10px',
            fontSize: 11,
            color: 'var(--pb-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Coming soon
        </div>
        {FUTURE.map((f) => (
          <div key={f} style={{ padding: '7px 10px', fontSize: 13, color: 'var(--pb-text-muted)', opacity: 0.55 }}>
            {f}
          </div>
        ))}

        <div style={{ flex: 1 }} />
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

      <main style={{ flex: 1, padding: '22px 26px', overflow: 'auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 6px', textTransform: 'capitalize' }}>{route}</h1>
        <p style={{ color: 'var(--pb-text-muted)', fontSize: 14, lineHeight: 1.6 }}>
          Coming together — connect a platform or import a CSV to see your unified net P&amp;L. Everything stays on this
          device.
        </p>
      </main>
    </div>
  )
}

function navStyle(active: boolean): CSSProperties {
  return {
    textAlign: 'left',
    border: 'none',
    cursor: 'pointer',
    borderRadius: 8,
    padding: '9px 11px',
    fontSize: 13,
    background: active ? 'var(--pb-active-bg)' : 'transparent',
    color: active ? 'var(--pb-primary-deep)' : 'var(--pb-text-muted)',
  }
}

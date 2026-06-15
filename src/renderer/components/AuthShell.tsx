import type { ReactNode } from 'react'

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div style={{ height: '100vh', display: 'grid', placeItems: 'center', background: 'var(--pb-bg)' }}>
      <div className="pb-card" style={{ width: 384, padding: '28px 30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <span
            style={{
              width: 30,
              height: 30,
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
          <span className="pb-serif" style={{ fontSize: 19, color: 'var(--pb-primary-deep)' }}>
            Pink Battleship
          </span>
        </div>
        <h1 style={{ fontSize: 17, fontWeight: 500, margin: '0 0 6px' }}>{title}</h1>
        <p style={{ fontSize: 13, color: 'var(--pb-text-muted)', lineHeight: 1.55, margin: '0 0 18px' }}>{subtitle}</p>
        {children}
      </div>
    </div>
  )
}

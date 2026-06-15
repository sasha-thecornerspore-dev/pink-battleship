import { Component, type ReactNode } from 'react'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div style={{ height: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
          <div style={{ maxWidth: 440 }}>
            <div className="pb-serif" style={{ fontSize: 22, marginBottom: 8, color: 'var(--pb-primary-deep)' }}>
              Something went wrong
            </div>
            <p style={{ color: 'var(--pb-text-muted)', fontSize: 14, lineHeight: 1.6, margin: '0 0 14px' }}>
              Your data is safe and local — nothing left this device. Reload to continue; your encrypted vault is untouched.
            </p>
            <button className="pb-btn pb-btn-primary" onClick={() => location.reload()}>
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

import { useEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { pb, qk } from './lib/api'
import { useUi } from './store/ui'
import { applyTheme } from './theme/themes'
import FirstRun from './screens/FirstRun'
import Unlock from './screens/Unlock'
import Shell from './Shell'

export default function App() {
  const theme = useUi((s) => s.theme)
  const mode = useUi((s) => s.mode)

  useEffect(() => {
    applyTheme(theme, mode)
  }, [theme, mode])

  const status = useQuery({ queryKey: qk.vaultStatus, queryFn: () => pb.vault.status() })

  if (status.isLoading || !status.data) return <Centered>Loading…</Centered>
  if (status.data === 'uninitialized') return <FirstRun />
  if (status.data === 'locked') return <Unlock />
  return <Shell />
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div style={{ height: '100vh', display: 'grid', placeItems: 'center', color: 'var(--pb-text-muted)' }}>
      {children}
    </div>
  )
}

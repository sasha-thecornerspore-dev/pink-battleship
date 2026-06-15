import { useEffect } from 'react'
import { useUi } from './store/ui'
import { pb } from './lib/api'
import Sidebar from './components/Sidebar'
import Dashboard from './screens/Dashboard'
import Connectors from './screens/Connectors'
import Import from './screens/Import'
import Settings from './screens/Settings'

export default function Shell() {
  const route = useUi((s) => s.route)
  const setTheme = useUi((s) => s.setTheme)
  const setMode = useUi((s) => s.setMode)

  useEffect(() => {
    pb.settings
      .getTheme()
      .then((p) => {
        setTheme(p.theme)
        setMode(p.mode)
      })
      .catch(() => {})
  }, [setTheme, setMode])

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '22px 26px', overflow: 'auto' }}>
        {route === 'dashboard' && <Dashboard />}
        {route === 'connectors' && <Connectors />}
        {route === 'import' && <Import />}
        {route === 'settings' && <Settings />}
      </main>
    </div>
  )
}

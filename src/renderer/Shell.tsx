import { useEffect } from 'react'
import { useUi } from './store/ui'
import { pb } from './lib/api'
import Sidebar from './components/Sidebar'
import Dashboard from './screens/Dashboard'
import Stats from './screens/Stats'
import Fans from './screens/Fans'
import Galleries from './screens/Galleries'
import Assistant from './screens/Assistant'
import Calendar from './screens/Calendar'
import Connectors from './screens/Connectors'
import Import from './screens/Import'
import Settings from './screens/Settings'
import Compliance from './screens/Compliance'

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
        {route === 'stats' && <Stats />}
        {route === 'fans' && <Fans />}
        {route === 'galleries' && <Galleries />}
        {route === 'assistant' && <Assistant />}
        {route === 'calendar' && <Calendar />}
        {route === 'connectors' && <Connectors />}
        {route === 'import' && <Import />}
        {route === 'compliance' && <Compliance />}
        {route === 'settings' && <Settings />}
      </main>
    </div>
  )
}

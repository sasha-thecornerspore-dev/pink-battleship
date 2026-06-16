import { useEffect, useState } from 'react'
import { useUi, type Route } from '../store/ui'

const STEPS: { route: Route; title: string; body: string }[] = [
  { route: 'dashboard', title: 'Dashboard', body: 'Your unified gross → net P&L across every platform, with each source tagged live-API or manual.' },
  { route: 'stats', title: 'Stats', body: 'Net earnings over time with a moving average, and a day×hour heatmap showing your best hours — by real dollars, not viewer guesses.' },
  { route: 'fans', title: 'Fans', body: 'Every spender ranked by net, with whale / VIP tiers, private notes, and a win-back nudge for fans who have gone quiet.' },
  { route: 'galleries', title: 'Galleries', body: 'A master library plus sellable sets. Tag assets, track where each is posted, and flip on Safe mode to hide NSFW tiles.' },
  { route: 'assistant', title: 'Assistant', body: 'Draft captions and fan replies. A free local model is the baseline; the safety router keeps explicit work off SFW providers and fan PII on-device.' },
  { route: 'calendar', title: 'Calendar', body: 'Plan posts, mass-DMs, go-lives and promos across platforms, with status tracking for each.' },
  { route: 'connectors', title: 'Connectors', body: 'Official APIs where they exist (Chaturbate), manual CSV where they do not — no automation, no ban risk.' },
  { route: 'import', title: 'Import', body: 'Drop a CSV, map the columns once, and it flows straight into your P&L. Nothing is uploaded anywhere.' },
  { route: 'compliance', title: 'Compliance', body: 'A 2257 records vault, custodian statement, tax set-aside, a DMCA generator, and a legal assistant — all on-device.' },
  { route: 'settings', title: 'Settings', body: 'Themes, rate estimates, AI providers, and your panic-lock. Everything stays encrypted on this device — no telemetry, ever.' },
]

export default function Tour() {
  const setRoute = useUi((s) => s.setRoute)
  const setTourOpen = useUi((s) => s.setTourOpen)
  const [step, setStep] = useState(0)
  const cur = STEPS[step]
  const last = step === STEPS.length - 1

  useEffect(() => {
    setRoute(cur.route)
  }, [cur.route, setRoute])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(40,25,35,0.28)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 28,
      }}
    >
      <div className="pb-card" style={{ width: 520, padding: '18px 22px', boxShadow: '0 10px 44px rgba(0,0,0,0.22)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span className="pb-serif" style={{ fontSize: 18, color: 'var(--pb-primary-deep)' }}>{cur.title}</span>
          <span style={{ fontSize: 12, color: 'var(--pb-text-muted)' }}>
            {step + 1} / {STEPS.length}
          </span>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: '0 0 14px' }}>{cur.body}</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="pb-btn" style={{ fontSize: 12 }} onClick={() => setTourOpen(false)}>
            Skip
          </button>
          <div style={{ flex: 1 }} />
          {step > 0 && (
            <button className="pb-btn" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          <button className="pb-btn pb-btn-primary" onClick={() => (last ? setTourOpen(false) : setStep(step + 1))}>
            {last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

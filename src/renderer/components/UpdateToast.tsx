import { useState } from 'react'
import { pb, useUpdates } from '../lib/api'

/** Unobtrusive "update ready" prompt shown on every screen once a download finishes. */
export default function UpdateToast() {
  const s = useUpdates().data
  const [dismissed, setDismissed] = useState<string | null>(null)
  if (!s || s.phase !== 'ready' || dismissed === s.availableVersion) return null

  return (
    <div
      className="pb-card"
      role="status"
      style={{ position: 'fixed', right: 18, bottom: 18, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', zIndex: 50, boxShadow: '0 6px 24px rgba(0,0,0,0.12)' }}
    >
      <span style={{ fontSize: 13 }}>Version {s.availableVersion} is ready.</span>
      <button className="pb-btn pb-btn-primary" style={{ fontSize: 12 }} onClick={() => void pb.updates.install()}>
        Restart now
      </button>
      <button className="pb-btn" style={{ fontSize: 12 }} onClick={() => setDismissed(s.availableVersion ?? '')} title="It will install the next time you quit">
        Later
      </button>
    </div>
  )
}

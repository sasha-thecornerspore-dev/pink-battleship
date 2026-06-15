import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { pb, qk } from '../lib/api'
import AuthShell from '../components/AuthShell'

export default function FirstRun() {
  const qc = useQueryClient()
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    if (p1.length < 8) return setErr('Use at least 8 characters.')
    if (p1 !== p2) return setErr('Passphrases do not match.')
    setErr(null)
    setBusy(true)
    try {
      await pb.vault.setup(p1)
      await qc.invalidateQueries({ queryKey: qk.vaultStatus })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Welcome — set your passphrase"
      subtitle="This encrypts your vault on this device. It is never sent anywhere, and if you lose it your data cannot be recovered."
    >
      <input
        className="pb-input"
        type="password"
        placeholder="Passphrase (min 8 characters)"
        value={p1}
        onChange={(e) => setP1(e.target.value)}
        style={{ marginBottom: 10 }}
      />
      <input
        className="pb-input"
        type="password"
        placeholder="Confirm passphrase"
        value={p2}
        onChange={(e) => setP2(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        style={{ marginBottom: 12 }}
      />
      {err && <div style={{ color: 'var(--pb-danger)', fontSize: 12, marginBottom: 12 }}>{err}</div>}
      <button className="pb-btn pb-btn-primary" style={{ width: '100%' }} onClick={submit} disabled={busy}>
        {busy ? 'Creating vault…' : 'Create encrypted vault'}
      </button>
    </AuthShell>
  )
}

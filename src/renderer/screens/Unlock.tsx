import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { pb, qk } from '../lib/api'
import AuthShell from '../components/AuthShell'

export default function Unlock() {
  const qc = useQueryClient()
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    setErr(null)
    setBusy(true)
    try {
      const { ok } = await pb.vault.unlock(pass)
      if (!ok) {
        setErr('Incorrect passphrase.')
        return
      }
      await qc.invalidateQueries({ queryKey: qk.vaultStatus })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Enter your passphrase to unlock your local vault.">
      <input
        className="pb-input"
        type="password"
        placeholder="Passphrase"
        autoFocus
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        style={{ marginBottom: 12 }}
      />
      {err && <div style={{ color: 'var(--pb-danger)', fontSize: 12, marginBottom: 12 }}>{err}</div>}
      <button className="pb-btn pb-btn-primary" style={{ width: '100%' }} onClick={submit} disabled={busy}>
        {busy ? 'Unlocking…' : 'Unlock'}
      </button>
    </AuthShell>
  )
}

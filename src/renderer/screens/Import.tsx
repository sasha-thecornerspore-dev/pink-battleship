import { useState, type ChangeEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { pb, qk } from '../lib/api'
import type { ImportCsvResult } from '@shared/ipc'

const PLATFORMS = [
  { id: 'onlyfans', label: 'OnlyFans' },
  { id: 'fansly', label: 'Fansly' },
  { id: 'manyvids', label: 'ManyVids' },
  { id: 'chaturbate', label: 'Chaturbate' },
]

const SAMPLE = `date,amount,type,payer
2026-05-01,24.99,sub,fan_amber
2026-05-02,8,tip,fan_lux
2026-05-04,40,ppv,fan_amber`

export default function Import() {
  const qc = useQueryClient()
  const [platformId, setPlatformId] = useState('onlyfans')
  const [csv, setCsv] = useState('')
  const [map, setMap] = useState({ date: 'date', amount: 'amount', kind: 'type', payer: 'payer' })
  const [result, setResult] = useState<ImportCsvResult | null>(null)
  const [busy, setBusy] = useState(false)

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => setCsv(String(r.result))
    r.readAsText(f)
  }

  const doImport = async () => {
    setBusy(true)
    try {
      const res = await pb.imports.csv({ platformId, csv, map })
      setResult(res)
      await qc.invalidateQueries({ queryKey: qk.pnl })
      await qc.invalidateQueries({ queryKey: qk.connectors })
    } finally {
      setBusy(false)
    }
  }

  const field = (key: keyof typeof map, label: string) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--pb-text-muted)' }}>
      {label}
      <input className="pb-input" value={map[key]} onChange={(e) => setMap({ ...map, [key]: e.target.value })} />
    </label>
  )

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ fontSize: 18, marginBottom: 4 }}>Import</div>
      <p style={{ color: 'var(--pb-text-muted)', fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
        Paste or upload a CSV export. Tell us which columns hold the date, amount, type and payer, and we map it into your
        unified P&amp;L. Nothing is uploaded anywhere.
      </p>

      <div className="pb-card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
          <select className="pb-input" style={{ width: 180 }} value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ fontSize: 12 }} />
          <button className="pb-btn" onClick={() => setCsv(SAMPLE)} style={{ marginLeft: 'auto' }}>
            Use sample
          </button>
        </div>

        <textarea
          className="pb-input"
          placeholder="Paste CSV here (first row = headers)"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          style={{ minHeight: 120, fontFamily: 'ui-monospace, monospace', fontSize: 12, marginBottom: 12 }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
          {field('date', 'Date column')}
          {field('amount', 'Amount column')}
          {field('kind', 'Type column')}
          {field('payer', 'Payer column')}
        </div>

        <button className="pb-btn pb-btn-primary" onClick={doImport} disabled={busy || !csv.trim()}>
          {busy ? 'Importing…' : 'Import'}
        </button>

        {result && (
          <div style={{ marginTop: 14, fontSize: 13 }}>
            <span style={{ color: 'var(--pb-sage-deep)' }}>Imported {result.inserted} transactions.</span>
            {result.skipped.length > 0 && (
              <span style={{ color: 'var(--pb-danger)', marginLeft: 8 }}>
                {result.skipped.length} row(s) skipped (line{result.skipped.length > 1 ? 's' : ''}{' '}
                {result.skipped.map((s) => s.line).join(', ')}).
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

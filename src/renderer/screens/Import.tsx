import { useState, useMemo, type ChangeEvent, type DragEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { pb, qk, money } from '../lib/api'
import type { ImportCsvResult } from '@shared/ipc'
import { guessCsvMapping, parseCsvHeaders, parseCsvTransactions, type CsvColumnMap } from '@core/connectors/manualCsv'

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

const FIELDS: { key: keyof CsvColumnMap; label: string }[] = [
  { key: 'date', label: 'Date column' },
  { key: 'amount', label: 'Amount column' },
  { key: 'kind', label: 'Type column' },
  { key: 'payer', label: 'Payer column' },
]

export default function Import() {
  const qc = useQueryClient()
  const [platformId, setPlatformId] = useState('onlyfans')
  const [csv, setCsv] = useState('')
  const [map, setMap] = useState<CsvColumnMap>({ date: 'date', amount: 'amount', kind: 'type', payer: 'payer' })
  const [result, setResult] = useState<ImportCsvResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const headers = parseCsvHeaders(csv)

  const applyCsv = (text: string, pid = platformId) => {
    setCsv(text)
    const h = parseCsvHeaders(text)
    if (h.length) setMap(guessCsvMapping(h, pid))
  }
  const readFile = (f: File | undefined) => {
    if (!f) return
    const r = new FileReader()
    r.onload = () => applyCsv(String(r.result))
    r.readAsText(f)
  }
  const onFile = (e: ChangeEvent<HTMLInputElement>) => readFile(e.target.files?.[0])
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    readFile(e.dataTransfer.files?.[0])
  }
  const changePlatform = (id: string) => {
    setPlatformId(id)
    if (headers.length) setMap(guessCsvMapping(headers, id))
  }
  const autoDetect = () => {
    if (headers.length) setMap(guessCsvMapping(headers, platformId))
  }

  // Live preview of exactly what will import, using the same parser as the import.
  const preview = useMemo(() => {
    if (!csv.trim() || !map.date || !map.amount) return null
    try {
      const r = parseCsvTransactions(csv, { platformId, map })
      return { rows: r.transactions.slice(0, 3), valid: r.transactions.length, skipped: r.skipped.length }
    } catch {
      return null
    }
  }, [csv, map, platformId])
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

  const field = ({ key, label }: { key: keyof CsvColumnMap; label: string }) => (
    <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--pb-text-muted)' }}>
      {label}
      {headers.length ? (
        <select className="pb-input" value={map[key] ?? ''} onChange={(e) => setMap({ ...map, [key]: e.target.value })}>
          <option value="">—</option>
          {headers.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      ) : (
        <input className="pb-input" value={map[key] ?? ''} onChange={(e) => setMap({ ...map, [key]: e.target.value })} />
      )}
    </label>
  )

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ fontSize: 18, marginBottom: 4 }}>Import</div>
      <p style={{ color: 'var(--pb-text-muted)', fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
        Paste or upload a CSV export. Columns are auto-detected from the headers — tweak if needed — and it maps into your
        unified P&amp;L. Nothing is uploaded anywhere.
      </p>

      <div className="pb-card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
          <select className="pb-input" style={{ width: 180 }} value={platformId} onChange={(e) => changePlatform(e.target.value)}>
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ fontSize: 12 }} />
          <button className="pb-btn" onClick={() => applyCsv(SAMPLE)} style={{ marginLeft: 'auto' }}>
            Use sample
          </button>
        </div>

        <textarea
          className="pb-input"
          placeholder="Paste CSV here, or drag a .csv file onto this box (first row = headers)"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          style={{
            minHeight: 120,
            fontFamily: 'ui-monospace, monospace',
            fontSize: 12,
            marginBottom: 10,
            borderColor: dragOver ? 'var(--pb-primary)' : undefined,
            borderWidth: dragOver ? 2 : undefined,
            background: dragOver ? 'var(--pb-active-bg)' : undefined,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--pb-text-muted)' }}>
            {headers.length ? `${headers.length} columns detected` : 'Paste or upload to detect columns'}
          </span>
          <button className="pb-btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={autoDetect} disabled={!headers.length}>
            Auto-detect columns
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
          {FIELDS.map((f) => field(f))}
        </div>

        {preview && (
          <div className="pb-card" style={{ padding: '10px 12px', marginBottom: 14, background: 'var(--pb-surface-2)' }}>
            <div style={{ fontSize: 12, marginBottom: 8, color: 'var(--pb-text-muted)' }}>
              Preview —{' '}
              <b style={{ color: 'var(--pb-sage-deep)' }}>{preview.valid} will import</b>
              {preview.skipped > 0 && <span style={{ color: 'var(--pb-danger)' }}> · {preview.skipped} will skip</span>}
            </div>
            {preview.rows.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: 'var(--pb-text-muted)', textAlign: 'left' }}>
                    <th style={th}>Date</th>
                    <th style={th}>Amount</th>
                    <th style={th}>Type</th>
                    <th style={th}>Payer</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((t, i) => (
                    <tr key={i}>
                      <td style={td}>{t.occurredAt}</td>
                      <td style={td}>{money(t.grossAmount)}</td>
                      <td style={td}>{t.kind}</td>
                      <td style={td}>{t.payerRef ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

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

const th: React.CSSProperties = { padding: '2px 8px 6px 0', fontWeight: 500, borderBottom: '1px solid var(--pb-border)' }
const td: React.CSSProperties = { padding: '4px 8px 4px 0', borderBottom: '1px solid var(--pb-border)' }

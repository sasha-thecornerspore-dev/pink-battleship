import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { pb, qk, money } from '../lib/api'
import type { ComplianceOverview, DmcaInput, DraftResult } from '@shared/models'

export default function Compliance() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: qk.compliance, queryFn: () => pb.compliance.overview() })
  const data = q.data
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.compliance })

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ fontSize: 18, marginBottom: 8 }}>Compliance</div>
      <div className="pb-card" style={{ padding: '10px 14px', marginBottom: 16, borderColor: 'var(--pb-gold)' }}>
        <span style={{ fontSize: 12, color: 'var(--pb-text-muted)' }}>
          Recordkeeping aid — <b>not legal advice</b>. Everything here stays encrypted on this device. Confirm your
          obligations (incl. 2257 secondary-producer scope) with qualified counsel.
        </span>
      </div>

      {!data ? (
        <p style={{ color: 'var(--pb-text-muted)' }}>Loading…</p>
      ) : (
        <>
          <Records data={data} onChange={invalidate} />
          <Tax data={data} />
          <Dmca />
          <LegalAssistant />
        </>
      )}
    </div>
  )
}

const EMPTY_REC = { legalName: '', aliases: '', dob: '', idType: 'Passport', idRef: '', productionDates: '' }

function Records({ data, onChange }: { data: ComplianceOverview; onChange: () => void }) {
  const [cust, setCust] = useState(data.custodian)
  const [form, setForm] = useState(EMPTY_REC)

  const saveCust = async () => {
    await pb.compliance.setCustodian(cust)
    onChange()
  }
  const add = async () => {
    if (!form.legalName.trim()) return
    await pb.compliance.addRecord(form)
    setForm(EMPTY_REC)
    onChange()
  }
  const remove = async (id: string) => {
    await pb.compliance.removeRecord(id)
    onChange()
  }

  return (
    <div className="pb-card" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 14, marginBottom: 8 }}>2257 records vault</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input className="pb-input" placeholder="Custodian name" value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} onBlur={saveCust} />
        <input className="pb-input" placeholder="Custodian address" value={cust.address} onChange={(e) => setCust({ ...cust, address: e.target.value })} onBlur={saveCust} />
      </div>

      {data.records.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {data.records.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--pb-border)', fontSize: 12 }}>
              <span style={{ width: 120 }}>{r.legalName}</span>
              <span style={{ color: 'var(--pb-text-muted)' }}>{r.aliases || '—'}</span>
              <span style={{ color: 'var(--pb-text-muted)' }}>DOB {r.dob || '—'}</span>
              <span style={{ color: 'var(--pb-text-muted)' }}>
                {r.idType} {r.idRef}
              </span>
              <span style={{ flex: 1 }} />
              <button className="pb-btn" style={{ fontSize: 11, padding: '3px 8px', borderColor: 'var(--pb-danger)', color: 'var(--pb-danger)' }} onClick={() => remove(r.id)} aria-label="Delete record">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        <input className="pb-input" placeholder="Legal name" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
        <input className="pb-input" placeholder="Aliases" value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} />
        <input className="pb-input" placeholder="DOB (YYYY-MM-DD)" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
        <input className="pb-input" placeholder="ID type" value={form.idType} onChange={(e) => setForm({ ...form, idType: e.target.value })} />
        <input className="pb-input" placeholder="ID reference" value={form.idRef} onChange={(e) => setForm({ ...form, idRef: e.target.value })} />
        <input className="pb-input" placeholder="Production dates" value={form.productionDates} onChange={(e) => setForm({ ...form, productionDates: e.target.value })} />
      </div>
      <button className="pb-btn pb-btn-primary" onClick={add} disabled={!form.legalName.trim()}>
        Add record
      </button>

      <div style={{ fontSize: 12, color: 'var(--pb-text-muted)', margin: '14px 0 6px' }}>Custodian statement</div>
      <textarea className="pb-input" readOnly value={data.custodianStatement} style={{ minHeight: 120, fontSize: 12, fontFamily: 'ui-monospace, monospace' }} />
      <button className="pb-btn" style={{ marginTop: 8, fontSize: 12 }} onClick={() => navigator.clipboard?.writeText(data.custodianStatement)}>
        Copy statement
      </button>
    </div>
  )
}

function Tax({ data }: { data: ComplianceOverview }) {
  return (
    <div className="pb-card" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 14, marginBottom: 8 }}>Tax set-aside</div>
      <div style={{ display: 'flex', gap: 28, alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--pb-text-muted)' }}>Net this period</div>
          <div style={{ fontSize: 18 }}>{money(data.tax.net)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--pb-text-muted)' }}>Set aside ({Math.round(data.tax.rate * 100)}%)</div>
          <div className="pb-serif" style={{ fontSize: 22, color: 'var(--pb-primary-deep)' }}>{money(data.tax.setAside)}</div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--pb-text-muted)', margin: '10px 0 0' }}>
        Rough estimate for US self-employment + income tax. Informational only — confirm with a CPA.
      </p>
    </div>
  )
}

function LegalAssistant() {
  const [q, setQ] = useState('')
  const [res, setRes] = useState<DraftResult | null>(null)
  const [busy, setBusy] = useState(false)
  const ask = async () => {
    setBusy(true)
    try {
      setRes(await pb.assistant.draft({ task: 'legal', context: q, explicit: false }))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="pb-card" style={{ padding: 16, marginTop: 14 }}>
      <div style={{ fontSize: 14, marginBottom: 4 }}>Legal assistant</div>
      <p style={{ fontSize: 12, color: 'var(--pb-text-muted)', margin: '0 0 8px', lineHeight: 1.5 }}>
        Ask a compliance/legal question or describe a document to draft. Routes to a local SFW model (e.g. your own law
        LLM) or a paid SFW key — never an explicit backend; fan PII is forced local. Not legal advice.
      </p>
      <textarea
        className="pb-input"
        placeholder="e.g. Do I need a 2257 custodian if I only repost others' content?"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ minHeight: 64, marginBottom: 8 }}
      />
      <button className="pb-btn pb-btn-primary" onClick={ask} disabled={busy || !q.trim()}>
        {busy ? 'Thinking…' : 'Ask'}
      </button>
      {res &&
        (res.ok ? (
          <div style={{ marginTop: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--pb-sage-deep)', background: 'var(--pb-sage-bg)', padding: '3px 9px', borderRadius: 20 }}>
              Routed via {res.routeLabel}
            </span>
            <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 8, whiteSpace: 'pre-wrap' }}>{res.text}</div>
          </div>
        ) : (
          <div style={{ marginTop: 10, color: 'var(--pb-danger)', fontSize: 13 }}>{res.blocked}</div>
        ))}
    </div>
  )
}

function Dmca() {
  const [form, setForm] = useState<DmcaInput>({ workTitle: '', infringingUrl: '', originalUrl: '', name: '' })
  const [notice, setNotice] = useState('')
  const gen = async () => setNotice(await pb.compliance.dmca(form))

  return (
    <div className="pb-card" style={{ padding: 16 }}>
      <div style={{ fontSize: 14, marginBottom: 8 }}>DMCA takedown generator</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <input className="pb-input" placeholder="Work title" value={form.workTitle} onChange={(e) => setForm({ ...form, workTitle: e.target.value })} />
        <input className="pb-input" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="pb-input" placeholder="Original URL" value={form.originalUrl} onChange={(e) => setForm({ ...form, originalUrl: e.target.value })} />
        <input className="pb-input" placeholder="Infringing URL" value={form.infringingUrl} onChange={(e) => setForm({ ...form, infringingUrl: e.target.value })} />
      </div>
      <button className="pb-btn pb-btn-primary" onClick={gen}>
        Generate notice
      </button>
      {notice && (
        <>
          <textarea className="pb-input" readOnly value={notice} style={{ minHeight: 160, fontSize: 12, fontFamily: 'ui-monospace, monospace', marginTop: 10 }} />
          <button className="pb-btn" style={{ marginTop: 8, fontSize: 12 }} onClick={() => navigator.clipboard?.writeText(notice)}>
            Copy notice
          </button>
        </>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { pb, qk, money } from '../lib/api'
import type { Sale, SaleStatus } from '@shared/models'

const VAMP = 1.5

const STATUS: Record<SaleStatus, { label: string; bg: string; fg: string }> = {
  paid: { label: 'Paid', bg: 'var(--pb-sage-bg)', fg: 'var(--pb-sage-deep)' },
  refunded: { label: 'Refunded', bg: 'var(--pb-track)', fg: 'var(--pb-text-muted)' },
  chargeback: { label: 'Chargeback', bg: '#f3dde4', fg: 'var(--pb-danger)' },
}

export default function Sales() {
  const qc = useQueryClient()
  const galleriesQ = useQuery({ queryKey: qk.galleries, queryFn: () => pb.galleries.list() })
  const paidQ = useQuery({ queryKey: [...qk.checkout, 'paid'], queryFn: () => pb.checkout.listPaid() })
  const salesQ = useQuery({ queryKey: [...qk.checkout, 'sales'], queryFn: () => pb.checkout.listSales() })
  const vampQ = useQuery({ queryKey: [...qk.checkout, 'vamp'], queryFn: () => pb.checkout.vamp() })

  const sellable = (galleriesQ.data ?? []).filter((g) => g.kind !== 'master')
  const paid = paidQ.data ?? {}
  const sales = [...(salesQ.data ?? [])].reverse()
  const vamp = vampQ.data
  const nameOf = (id: string) => galleriesQ.data?.find((g) => g.id === id)?.name ?? id

  const [gallery, setGallery] = useState('')
  const [price, setPrice] = useState('25')
  const [currency, setCurrency] = useState('USD')
  const [busy, setBusy] = useState(false)

  const refresh = () => qc.invalidateQueries({ queryKey: qk.checkout })
  const wrap = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const publish = () => {
    const id = gallery || sellable[0]?.id
    if (!id) return
    const priceMinor = Math.round((Number(price) || 0) * 100)
    if (priceMinor <= 0) return
    return wrap(() => pb.checkout.setPaid(id, { priceMinor, currency, processor: 'mock' }))
  }
  const unpublish = (id: string) => wrap(() => pb.checkout.setPaid(id, null))
  const simulate = (id: string) => wrap(() => pb.checkout.simulateSale(id))
  const dispute = (saleId: string, type: 'refund' | 'chargeback') => wrap(() => pb.checkout.dispute(saleId, type))
  const evidence = (saleId: string) => pb.checkout.exportEvidence(saleId)

  return (
    <div>
      <div style={{ fontSize: 18, marginBottom: 4 }}>Sales</div>
      <p style={{ color: 'var(--pb-text-muted)', fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
        Sell a gallery directly. The desktop is the only thing that can release media — it re-verifies the processor’s
        signed payment before unlocking, and every sale carries a per-buyer watermark for leak traceability.
      </p>

      <div className="pb-card" style={{ padding: '10px 14px', marginBottom: 14, borderColor: 'var(--pb-gold)' }}>
        <span style={{ fontSize: 12, color: 'var(--pb-text-muted)' }}>
          <b style={{ color: 'var(--pb-primary-deep)' }}>Sandbox.</b> Checkout runs locally against a mock processor — nothing
          leaves your machine and no real money moves. Connect a real processor (CCBill / Segpay / crypto) and the hosted
          component to go live; the flow below is exactly what plugs in. See <code>docs/paid-galleries-design.md</code>.
        </span>
      </div>

      {/* VAMP monitor */}
      {vamp && (
        <div className="pb-card" style={{ padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: vamp.ratioPct >= VAMP ? 'var(--pb-danger)' : 'var(--pb-sage-deep)' }}>
              {vamp.ratioPct}%
            </div>
            <div style={{ fontSize: 11, color: 'var(--pb-text-muted)' }}>dispute ratio</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ height: 7, background: 'var(--pb-track)', borderRadius: 6, position: 'relative' }}>
              <div style={{ width: `${Math.min(100, (vamp.ratioPct / (VAMP * 2)) * 100)}%`, height: 7, background: vamp.ratioPct >= VAMP ? 'var(--pb-danger)' : 'var(--pb-sage)', borderRadius: 6 }} />
              <div style={{ position: 'absolute', left: '50%', top: -3, width: 1, height: 13, background: 'var(--pb-danger)' }} title="1.5% VAMP threshold" />
            </div>
            <div style={{ fontSize: 11, color: 'var(--pb-text-muted)', marginTop: 4 }}>
              {vamp.sales} sales · {vamp.disputes} disputes · stay under the <b>1.5%</b> VAMP threshold (chargebacks over it cost ~$8 each)
            </div>
          </div>
        </div>
      )}

      {/* publish */}
      <div className="pb-card" style={{ padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ fontSize: 14, marginBottom: 10 }}>Publish a gallery for sale</div>
        {sellable.length === 0 ? (
          <span style={{ fontSize: 12, color: 'var(--pb-text-muted)' }}>Create a set in Galleries first (the master gallery isn’t sellable).</span>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="pb-input" value={gallery || sellable[0]?.id} onChange={(e) => setGallery(e.target.value)} style={{ width: 180 }}>
              {sellable.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 13, color: 'var(--pb-text-muted)' }}>$</span>
            <input className="pb-input" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: 70 }} />
            <select className="pb-input" value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ width: 80 }}>
              {['USD', 'EUR', 'GBP'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button className="pb-btn pb-btn-primary" onClick={publish} disabled={busy}>
              Publish
            </button>
          </div>
        )}

        {Object.keys(paid).length > 0 && (
          <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
            {Object.entries(paid).map(([id, cfg]) => (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <span style={{ flex: 1 }}>
                  <b>{nameOf(id)}</b> · {money(cfg.priceMinor / 100)} {cfg.currency} · {cfg.processor}
                </span>
                <button className="pb-btn" style={{ fontSize: 11 }} onClick={() => simulate(id)} disabled={busy}>
                  Simulate a sale
                </button>
                <button className="pb-btn" style={{ fontSize: 11, color: 'var(--pb-danger)', borderColor: 'var(--pb-danger)' }} onClick={() => unpublish(id)} disabled={busy}>
                  Unpublish
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ledger */}
      <div className="pb-card" style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 14, marginBottom: 10 }}>Sales &amp; evidence</div>
        {sales.length === 0 ? (
          <span style={{ fontSize: 12, color: 'var(--pb-text-muted)' }}>No sales yet — publish a gallery and click “Simulate a sale”.</span>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {sales.map((s) => (
              <SaleRow key={s.saleId} sale={s} name={nameOf(s.galleryId)} busy={busy} onDispute={dispute} onEvidence={evidence} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SaleRow({
  sale,
  name,
  busy,
  onDispute,
  onEvidence,
}: {
  sale: Sale
  name: string
  busy: boolean
  onDispute: (saleId: string, type: 'refund' | 'chargeback') => void
  onEvidence: (saleId: string) => void
}) {
  const st = STATUS[sale.status]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, padding: '8px 0', borderBottom: '1px solid var(--pb-border)' }}>
      <div style={{ width: 120, flexShrink: 0 }}>
        <div style={{ fontSize: 13 }}>{name}</div>
        <div style={{ color: 'var(--pb-text-muted)' }}>{new Date(sale.paidAt).toLocaleDateString()}</div>
      </div>
      <span style={{ width: 70, textAlign: 'right', color: 'var(--pb-sage-deep)', flexShrink: 0 }}>{money(sale.grossAmountMinor / 100)}</span>
      <span style={{ fontSize: 11, background: st.bg, color: st.fg, padding: '2px 8px', borderRadius: 12, flexShrink: 0 }}>{st.label}</span>
      <span style={{ flex: 1, color: 'var(--pb-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${sale.buyerTokenHash} · ${sale.watermarkId}`}>
        buyer {sale.buyerTokenHash.slice(0, 10)} · {sale.watermarkId}
      </span>
      <button className="pb-btn" style={{ fontSize: 11 }} onClick={() => onEvidence(sale.saleId)}>
        Evidence
      </button>
      {sale.status === 'paid' && (
        <button className="pb-btn" style={{ fontSize: 11, color: 'var(--pb-danger)', borderColor: 'var(--pb-danger)' }} onClick={() => onDispute(sale.saleId, 'chargeback')} disabled={busy} title="Simulate a chargeback">
          Chargeback
        </button>
      )}
    </div>
  )
}

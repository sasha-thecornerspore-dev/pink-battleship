import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { pb, qk } from '../lib/api'
import type { Asset } from '@shared/models'

const PLATFORM_LABEL: Record<string, string> = {
  chaturbate: 'CB',
  onlyfans: 'OF',
  fansly: 'FS',
  manyvids: 'MV',
  reddit: 'Reddit',
  x: 'X',
}
const TILE_COLORS = ['#e6cfd9', '#dcd0ec', '#e7dcc6', '#d6e2da', '#e7d3cb', '#d6dde8']
const PLATFORMS = ['chaturbate', 'onlyfans', 'fansly', 'manyvids', 'reddit', 'x']

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

function fmtSize(bytes?: number): string {
  if (!bytes) return ''
  const u = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024
    i++
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${u[i]}`
}

export default function Galleries() {
  const qc = useQueryClient()
  const galleriesQ = useQuery({ queryKey: qk.galleries, queryFn: () => pb.galleries.list() })
  const [selected, setSelected] = useState('master')
  const [safe, setSafe] = useState(false)
  const [busy, setBusy] = useState(false)
  const assetsQ = useQuery({ queryKey: [...qk.galleries, 'assets', selected], queryFn: () => pb.galleries.assets(selected) })

  const galleries = galleriesQ.data ?? []
  const assets = assetsQ.data ?? []

  const newSet = async () => {
    const name = window.prompt('Name this set')
    if (!name) return
    const g = await pb.galleries.createSet(name)
    await qc.invalidateQueries({ queryKey: qk.galleries })
    setSelected(g.id)
  }

  const importFiles = async () => {
    setBusy(true)
    try {
      await pb.galleries.importFiles(selected)
      await qc.invalidateQueries({ queryKey: qk.galleries })
      await qc.invalidateQueries({ queryKey: [...qk.galleries, 'assets', selected] })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 18 }}>Galleries</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="pb-btn" onClick={importFiles} disabled={busy} style={{ fontSize: 12 }} title="Reference files in place — originals are never copied">
            {busy ? 'Importing…' : 'Import files…'}
          </button>
          <button className={safe ? 'pb-btn pb-btn-primary' : 'pb-btn'} onClick={() => setSafe((s) => !s)} style={{ fontSize: 12 }}>
            Safe mode {safe ? 'on' : 'off'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'start' }}>
        <div>
          {galleries.map((g) => {
            const active = selected === g.id
            return (
              <button
                key={g.id}
                onClick={() => setSelected(g.id)}
                className="pb-btn"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  marginBottom: 6,
                  background: active ? 'var(--pb-active-bg)' : 'var(--pb-surface)',
                  borderColor: active ? 'var(--pb-primary)' : 'var(--pb-border)',
                  color: active ? 'var(--pb-primary-deep)' : 'var(--pb-text)',
                }}
              >
                <span>{g.name}</span>
                <span style={{ color: 'var(--pb-text-muted)' }}>{g.assetCount}</span>
              </button>
            )
          })}
          <button className="pb-btn" onClick={newSet} style={{ width: '100%', marginTop: 4 }}>
            + New set
          </button>
        </div>

        {assets.length === 0 ? (
          <div className="pb-card" style={{ padding: 20 }}>
            <span style={{ color: 'var(--pb-text-muted)', fontSize: 13 }}>
              No assets yet. Click <b>Import files…</b> to add photos and videos — they’re referenced in place (never copied),
              with thumbnails and dimensions read on the spot.
            </span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {assets.map((a) => (
              <AssetTile key={a.id} asset={a} safe={safe} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MediaGlyph({ kind }: { kind: Asset['mediaKind'] }) {
  return kind === 'video' ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <polygon points="9,7 17,12 9,17" fill="currentColor" stroke="none" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" fill="currentColor" stroke="none" />
      <path d="M5 17l4-4 3 3 3-3 4 4" />
    </svg>
  )
}

function AssetTile({ asset, safe }: { asset: Asset; safe: boolean }) {
  const qc = useQueryClient()
  const hidden = safe && asset.nsfw
  const color = TILE_COLORS[hash(asset.filename) % TILE_COLORS.length]
  const refresh = () => qc.invalidateQueries({ queryKey: qk.galleries })
  const togglePosted = async (p: string) => {
    await pb.galleries.togglePosted(asset.id, p)
    await refresh()
  }
  const addTag = async () => {
    const t = window.prompt('Add a tag')?.trim()
    if (!t || asset.tags.includes(t)) return
    await pb.galleries.setTags(asset.id, [...asset.tags, t])
    await refresh()
  }
  const removeTag = async (t: string) => {
    await pb.galleries.setTags(
      asset.id,
      asset.tags.filter((x) => x !== t),
    )
    await refresh()
  }
  return (
    <div className="pb-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          height: 110,
          background: hidden ? 'var(--pb-track)' : color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          color: 'var(--pb-primary-deep)',
        }}
      >
        {hidden ? (
          <span style={{ fontSize: 12, color: 'var(--pb-text-muted)' }}>Hidden · safe mode</span>
        ) : asset.thumb ? (
          <img src={asset.thumb} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <MediaGlyph kind={asset.mediaKind} />
        )}
        {asset.nsfw && !hidden && (
          <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 9, background: 'rgba(0,0,0,0.35)', color: '#fff', padding: '1px 6px', borderRadius: 10 }}>
            18+
          </span>
        )}
        {!hidden && (
          <span style={{ position: 'absolute', bottom: 6, right: 6, fontSize: 10, color: 'var(--pb-primary-deep)', background: 'rgba(255,255,255,0.6)', padding: '1px 6px', borderRadius: 10 }}>
            {asset.dims}
          </span>
        )}
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: 12, marginBottom: asset.sizeBytes ? 2 : 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.filename}</div>
        {asset.sizeBytes ? <div style={{ fontSize: 10, color: 'var(--pb-text-muted)', marginBottom: 5 }}>{fmtSize(asset.sizeBytes)} · referenced in place</div> : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6, alignItems: 'center' }}>
          {asset.tags.map((t) => (
            <span
              key={t}
              onClick={() => removeTag(t)}
              title="Remove tag"
              style={{ cursor: 'pointer', fontSize: 10, background: 'var(--pb-track)', padding: '1px 6px', borderRadius: 10, color: 'var(--pb-text-muted)' }}
            >
              {t} ×
            </span>
          ))}
          <button onClick={addTag} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 10, color: 'var(--pb-primary-deep)' }}>
            + tag
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--pb-text-muted)', marginRight: 2 }}>Posted:</span>
          {PLATFORMS.map((p) => {
            const on = asset.postedTo.includes(p)
            return (
              <button
                key={p}
                onClick={() => togglePosted(p)}
                title={`Toggle posted on ${PLATFORM_LABEL[p] ?? p}`}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 9,
                  padding: '2px 6px',
                  borderRadius: 8,
                  background: on ? 'var(--pb-sage-bg)' : 'var(--pb-track)',
                  color: on ? 'var(--pb-sage-deep)' : 'var(--pb-text-muted)',
                }}
              >
                {PLATFORM_LABEL[p] ?? p}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

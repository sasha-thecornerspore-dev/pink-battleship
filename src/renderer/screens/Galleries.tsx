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

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export default function Galleries() {
  const qc = useQueryClient()
  const galleriesQ = useQuery({ queryKey: qk.galleries, queryFn: () => pb.galleries.list() })
  const [selected, setSelected] = useState('master')
  const [safe, setSafe] = useState(false)
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 18 }}>Galleries</div>
        <button className={safe ? 'pb-btn pb-btn-primary' : 'pb-btn'} onClick={() => setSafe((s) => !s)} style={{ fontSize: 12 }}>
          Safe mode {safe ? 'on' : 'off'}
        </button>
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
              No assets yet. File import + thumbnails are coming — this build models the catalog (tags, NSFW, posted-status).
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
  const hidden = safe && asset.nsfw
  const color = TILE_COLORS[hash(asset.filename) % TILE_COLORS.length]
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
        {hidden ? <span style={{ fontSize: 12, color: 'var(--pb-text-muted)' }}>Hidden · safe mode</span> : <MediaGlyph kind={asset.mediaKind} />}
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
        <div style={{ fontSize: 12, marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.filename}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 5 }}>
          {asset.tags.map((t) => (
            <span key={t} style={{ fontSize: 10, background: 'var(--pb-track)', padding: '1px 6px', borderRadius: 10, color: 'var(--pb-text-muted)' }}>
              {t}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {asset.postedTo.length === 0 ? (
            <span style={{ fontSize: 10, color: 'var(--pb-text-muted)' }}>not posted</span>
          ) : (
            asset.postedTo.map((p) => (
              <span key={p} style={{ fontSize: 10, background: 'var(--pb-sage-bg)', color: 'var(--pb-sage-deep)', padding: '1px 6px', borderRadius: 10 }}>
                {PLATFORM_LABEL[p] ?? p}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

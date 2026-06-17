import { useEffect, useState } from 'react'
import { pb } from '../lib/api'
import { buildSite, DEFAULT_SITE } from '@core/website/siteBuilder'
import type { SiteConfig, ThemeId } from '@shared/models'

const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'blush', label: 'Blush' },
  { id: 'lavender', label: 'Lavender' },
  { id: 'rose', label: 'Rose' },
]

export default function Website() {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_SITE)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    pb.website.getConfig().then(setConfig).catch(() => {})
  }, [])

  const patch = (p: Partial<SiteConfig>) => {
    setConfig((c) => ({ ...c, ...p }))
    setSaved(false)
  }
  const setLink = (i: number, p: Partial<{ label: string; url: string }>) =>
    patch({ links: config.links.map((l, j) => (j === i ? { ...l, ...p } : l)) })
  const addLink = () => patch({ links: [...config.links, { label: '', url: '' }] })
  const removeLink = (i: number) => patch({ links: config.links.filter((_, j) => j !== i) })

  const save = async () => {
    await pb.website.save(config)
    setSaved(true)
  }
  const exportSite = async () => {
    await pb.website.save(config)
    await pb.website.export(config)
  }

  return (
    <div>
      <div style={{ fontSize: 18, marginBottom: 4 }}>Website</div>
      <p style={{ color: 'var(--pb-text-muted)', fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
        A self-contained link-in-bio page, generated on your machine — no trackers, no external requests. The 18+ splash
        helps your link survive Instagram, TikTok and Reddit. Export the HTML and host it anywhere.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 18, alignItems: 'start' }}>
        {/* Editor */}
        <div className="pb-card" style={{ padding: '16px 18px' }}>
          <Field label="Display name">
            <input className="pb-input" value={config.displayName} onChange={(e) => patch({ displayName: e.target.value })} placeholder="Rosie Belle" />
          </Field>
          <Field label="Handle (used for the file name)">
            <input className="pb-input" value={config.handle} onChange={(e) => patch({ handle: e.target.value })} placeholder="rosiebelle" />
          </Field>
          <Field label="Tagline">
            <input className="pb-input" value={config.tagline} onChange={(e) => patch({ tagline: e.target.value })} placeholder="cam · customs · clips" />
          </Field>
          <Field label="Bio">
            <textarea className="pb-input" rows={3} value={config.bio} onChange={(e) => patch({ bio: e.target.value })} placeholder="New drops every Friday…" style={{ resize: 'vertical' }} />
          </Field>

          <Field label="Theme">
            <div style={{ display: 'flex', gap: 8 }}>
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className="pb-btn"
                  onClick={() => patch({ theme: t.id })}
                  style={config.theme === t.id ? { borderColor: 'var(--pb-primary)', color: 'var(--pb-primary-deep)' } : undefined}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Links">
            <div style={{ display: 'grid', gap: 8 }}>
              {config.links.map((l, i) => (
                <div key={i} style={{ display: 'flex', gap: 6 }}>
                  <input className="pb-input" style={{ flex: '0 0 34%' }} placeholder="Label" value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} />
                  <input className="pb-input" style={{ flex: 1 }} placeholder="https://…" value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} />
                  <button className="pb-btn" onClick={() => removeLink(i)} aria-label="Remove link" style={{ flex: '0 0 auto', color: 'var(--pb-danger)', borderColor: 'var(--pb-danger)' }}>
                    ×
                  </button>
                </div>
              ))}
              <button className="pb-btn" onClick={addLink} style={{ justifySelf: 'start' }}>
                + Add link
              </button>
            </div>
          </Field>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--pb-text)', marginTop: 4 }}>
            <input type="checkbox" checked={config.ageGate} onChange={(e) => patch({ ageGate: e.target.checked })} />
            Show 18+ age gate (recommended)
          </label>

          <div style={{ display: 'flex', gap: 8, marginTop: 18, alignItems: 'center' }}>
            <button className="pb-btn pb-btn-primary" onClick={save}>
              Save
            </button>
            <button className="pb-btn" onClick={exportSite}>
              Export HTML…
            </button>
            {saved && <span style={{ fontSize: 12, color: 'var(--pb-sage-deep)' }}>Saved.</span>}
          </div>
        </div>

        {/* Live preview */}
        <div style={{ position: 'sticky', top: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--pb-text-muted)', marginBottom: 6 }}>Live preview</div>
          <iframe
            title="Site preview"
            sandbox="allow-scripts"
            srcDoc={buildSite(config)}
            style={{ width: '100%', height: 560, border: '1px solid var(--pb-border)', borderRadius: 14, background: '#fff' }}
          />
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: 'var(--pb-text-muted)', marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  )
}

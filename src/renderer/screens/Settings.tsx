import { useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRates, usePrivacy, pb, qk } from '../lib/api'
import { useUi } from '../store/ui'
import { THEMES } from '../theme/themes'
import type { RateRule, ThemeId, ThemeMode } from '@shared/models'

const PLATFORM_LABEL: Record<string, string> = {
  chaturbate: 'Chaturbate',
  onlyfans: 'OnlyFans',
  fansly: 'Fansly',
  manyvids: 'ManyVids',
}

export default function Settings() {
  const qc = useQueryClient()
  const theme = useUi((s) => s.theme)
  const mode = useUi((s) => s.mode)
  const setTheme = useUi((s) => s.setTheme)
  const setMode = useUi((s) => s.setMode)
  const ratesQ = useRates()
  const privacyQ = usePrivacy()

  const choose = async (t: ThemeId, m: ThemeMode) => {
    setTheme(t)
    setMode(m)
    await pb.settings.setTheme({ theme: t, mode: m })
  }

  const lock = async () => {
    await pb.vault.lock()
    await qc.invalidateQueries({ queryKey: qk.vaultStatus })
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ fontSize: 18, marginBottom: 18 }}>Settings</div>

      <Section title="Appearance">
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => choose(t.id, mode)}
              className="pb-card"
              style={{
                padding: 10,
                cursor: 'pointer',
                borderColor: theme === t.id ? 'var(--pb-primary)' : 'var(--pb-border)',
                borderWidth: theme === t.id ? 2 : 1,
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 12, marginBottom: 7 }}>{t.label}</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {t.swatches.map((s, i) => (
                  <span key={i} style={{ width: 20, height: 20, borderRadius: 5, background: s, border: '1px solid var(--pb-border)' }} />
                ))}
              </div>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['light', 'dark'] as ThemeMode[]).map((m) => (
            <button
              key={m}
              className={mode === m ? 'pb-btn pb-btn-primary' : 'pb-btn'}
              onClick={() => choose(theme, m)}
              style={{ textTransform: 'capitalize' }}
            >
              {m}
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="Platform rates (estimates)"
        subtitle="Used to compute net from gross. Defaults are rough estimates — adjust to your real terms."
      >
        {(ratesQ.data ?? []).map((r) => (
          <RateRow
            key={r.id}
            rule={r}
            onSaved={async () => {
              await qc.invalidateQueries({ queryKey: qk.rates })
              await qc.invalidateQueries({ queryKey: qk.pnl })
            }}
          />
        ))}
      </Section>

      <Section
        title="What leaves your machine"
        subtitle="Every declared outbound destination and the live egress log. In this build, only an official Chaturbate connector would ever reach the network."
      >
        {(privacyQ.data?.declared ?? []).length === 0 ? (
          <span style={{ fontSize: 13, color: 'var(--pb-text-muted)' }}>No connectors yet.</span>
        ) : (
          privacyQ.data!.declared.map((d) => (
            <div key={d.connectorId} style={{ fontSize: 13, marginBottom: 6 }}>
              <b>{PLATFORM_LABEL[d.platformId] ?? d.platformId}</b> ({d.driver}) →{' '}
              {d.dataFlows.length === 0 ? (
                <span style={{ color: 'var(--pb-sage-deep)' }}>nothing leaves this device</span>
              ) : (
                d.dataFlows.join(', ')
              )}
            </div>
          ))
        )}
        {(privacyQ.data?.log ?? []).length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--pb-text-muted)' }}>
            {privacyQ.data!.log.slice(0, 10).map((e, i) => (
              <div key={i}>
                {e.ts} · {e.host} · {e.purpose}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Security">
        <button className="pb-btn" onClick={lock} style={{ borderColor: 'var(--pb-danger)', color: 'var(--pb-danger)' }}>
          Panic-lock vault now
        </button>
        <p style={{ fontSize: 12, color: 'var(--pb-text-muted)', marginTop: 8, marginBottom: 0 }}>
          Instantly wipes the in-memory key and returns to the lock screen. Your passphrase is required to reopen.
        </p>
      </Section>
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="pb-card" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 14, marginBottom: subtitle ? 3 : 10 }}>{title}</div>
      {subtitle && <p style={{ fontSize: 12, color: 'var(--pb-text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>{subtitle}</p>}
      {children}
    </div>
  )
}

function RateRow({ rule, onSaved }: { rule: RateRule; onSaved: () => void }) {
  const [pct, setPct] = useState(String(Math.round(rule.rate * 1000) / 10))
  const [saved, setSaved] = useState(false)

  const save = async () => {
    const rate = Math.max(0, Math.min(100, Number(pct) || 0)) / 100
    await pb.rates.upsert({ ...rule, rate })
    setSaved(true)
    onSaved()
    window.setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 13, width: 110 }}>{PLATFORM_LABEL[rule.platformId] ?? rule.platformId}</span>
      <span style={{ fontSize: 12, color: 'var(--pb-text-muted)', flex: 1 }}>{rule.note}</span>
      <input className="pb-input" value={pct} onChange={(e) => setPct(e.target.value)} style={{ width: 64 }} />
      <span style={{ fontSize: 13, color: 'var(--pb-text-muted)' }}>%</span>
      <button className="pb-btn" onClick={save}>
        {saved ? 'Saved' : 'Save'}
      </button>
    </div>
  )
}

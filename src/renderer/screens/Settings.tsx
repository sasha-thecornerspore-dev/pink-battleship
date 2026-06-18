import { useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRates, usePrivacy, pb, qk } from '../lib/api'
import { useUi } from '../store/ui'
import { THEMES } from '../theme/themes'
import type { AssistantProvider, RateRule, ThemeId, ThemeMode } from '@shared/models'

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

      <AiKeys />

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

function AiKeys() {
  const qc = useQueryClient()
  const cfg = useQuery({ queryKey: qk.assistant, queryFn: () => pb.assistant.config() })
  const ollama = useQuery({ queryKey: [...qk.assistant, 'ollama'], queryFn: () => pb.assistant.ollama() })
  const providers = cfg.data?.providers ?? []
  const available = new Set(cfg.data?.available ?? [])
  const localModel = cfg.data?.localModel ?? ''
  const modelOverrides = cfg.data?.models ?? {}
  const modelDefaults = cfg.data?.modelDefaults ?? {}
  const running = !!ollama.data?.running
  const models = ollama.data?.models ?? []

  const saveKey = async (provider: string, key: string) => {
    await pb.assistant.setKey(provider, key)
    await qc.invalidateQueries({ queryKey: qk.assistant })
  }
  const saveModel = async (provider: string, model: string) => {
    await pb.assistant.setModel(provider, model)
    await qc.invalidateQueries({ queryKey: qk.assistant })
  }
  const pickModel = async (m: string) => {
    await pb.assistant.setLocalModel(m)
    await qc.invalidateQueries({ queryKey: qk.assistant })
  }
  const byTier = (t: string) => providers.filter((p) => p.tier === t)

  return (
    <Section
      title="AI providers — free vs paid"
      subtitle="What powers the Assistant. A free local model is the dependable baseline; free hosted tiers are fast but SFW-only; paid keys add premium SFW (Claude/GPT) and explicit-capable cloud (Venice/Atlas/OpenRouter). Keys live in your OS keychain."
    >
      <TierHeader label="Free · local (default)" />
      {byTier('free-local').map((p) => (
        <div key={p.id} style={{ marginBottom: 10 }}>
          <ProviderHead p={p} dot={running} right={running ? 'running' : 'not detected'} />
          {running ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6, paddingLeft: 18 }}>
              {models.length ? (
                models.map((m) => (
                  <button key={m} className={localModel === m ? 'pb-btn pb-btn-primary' : 'pb-btn'} style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => pickModel(m)}>
                    {m}
                  </button>
                ))
              ) : (
                <span style={{ fontSize: 11, color: 'var(--pb-text-muted)' }}>
                  No models pulled yet — run <code>ollama pull dolphin-llama3:8b</code>.
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--pb-text-muted)', marginTop: 4, paddingLeft: 18 }}>
              Install <b>Ollama</b> and pull an uncensored model (e.g. <code>ollama pull dolphin-llama3:8b</code>) — it then
              appears here. ~12 GB VRAM handles 8–12B.
            </div>
          )}
        </div>
      ))}

      <TierHeader label="Free · hosted (SFW, no GPU)" />
      {byTier('free-hosted').map((p) => (
        <KeyRow key={p.id} p={p} connected={available.has(p.id)} onSave={saveKey} model={modelOverrides[p.id] ?? ''} modelDefault={modelDefaults[p.id] ?? ''} onSaveModel={saveModel} />
      ))}

      <TierHeader label="Paid · bring your own key" />
      {byTier('paid').map((p) => (
        <KeyRow key={p.id} p={p} connected={available.has(p.id)} onSave={saveKey} model={modelOverrides[p.id] ?? ''} modelDefault={modelDefaults[p.id] ?? ''} onSaveModel={saveModel} />
      ))}
    </Section>
  )
}

function TierHeader({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 11, color: 'var(--pb-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, margin: '12px 0 6px' }}>
      {label}
    </div>
  )
}

function PolicyTag({ explicitOk }: { explicitOk: boolean }) {
  return (
    <span
      style={{
        fontSize: 10,
        padding: '1px 6px',
        borderRadius: 10,
        background: explicitOk ? 'var(--pb-active-bg)' : 'var(--pb-track)',
        color: explicitOk ? 'var(--pb-primary-deep)' : 'var(--pb-text-muted)',
        flexShrink: 0,
      }}
    >
      {explicitOk ? 'explicit-ok' : 'SFW only'}
    </span>
  )
}

function ProviderHead({ p, dot, right }: { p: AssistantProvider; dot: boolean; right: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot ? 'var(--pb-sage)' : 'var(--pb-track)', flexShrink: 0 }} />
      <span style={{ fontSize: 13, flexShrink: 0 }}>{p.label}</span>
      <PolicyTag explicitOk={p.explicitOk} />
      <span style={{ fontSize: 11, color: 'var(--pb-text-muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {p.blurb}
      </span>
      <span style={{ fontSize: 11, color: dot ? 'var(--pb-sage-deep)' : 'var(--pb-text-muted)', flexShrink: 0 }}>{right}</span>
    </div>
  )
}

function KeyRow({
  p,
  connected,
  onSave,
  model,
  modelDefault,
  onSaveModel,
}: {
  p: AssistantProvider
  connected: boolean
  onSave: (provider: string, key: string) => void
  model: string
  modelDefault: string
  onSaveModel: (provider: string, model: string) => void
}) {
  const [value, setValue] = useState('')
  return (
    <div style={{ marginBottom: 10 }}>
      <ProviderHead p={p} dot={connected} right={connected ? 'connected' : ''} />
      <div style={{ display: 'flex', gap: 8, paddingLeft: 18, marginTop: 4 }}>
        {connected ? (
          <button className="pb-btn" style={{ fontSize: 11 }} onClick={() => onSave(p.id, '')}>
            Remove key
          </button>
        ) : (
          <>
            <input className="pb-input" type="password" placeholder={`${p.label} API key`} value={value} onChange={(e) => setValue(e.target.value)} style={{ flex: 1 }} />
            <button
              className="pb-btn pb-btn-primary"
              style={{ fontSize: 11 }}
              disabled={!value.trim()}
              onClick={() => {
                onSave(p.id, value.trim())
                setValue('')
              }}
            >
              Save
            </button>
          </>
        )}
      </div>
      {connected && <ModelRow provider={p.id} value={model} placeholder={modelDefault} onSave={onSaveModel} />}
    </div>
  )
}

function ModelRow({ provider, value, placeholder, onSave }: { provider: string; value: string; placeholder: string; onSave: (provider: string, model: string) => void }) {
  const [model, setModel] = useState(value)
  const [saved, setSaved] = useState(false)
  const dirty = model.trim() !== value.trim()
  return (
    <div style={{ display: 'flex', gap: 8, paddingLeft: 18, marginTop: 6, alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: 'var(--pb-text-muted)', flexShrink: 0 }}>Model</span>
      <input
        className="pb-input"
        style={{ flex: 1, fontSize: 11 }}
        placeholder={placeholder}
        value={model}
        onChange={(e) => {
          setModel(e.target.value)
          setSaved(false)
        }}
      />
      <button
        className="pb-btn"
        style={{ fontSize: 11 }}
        disabled={!dirty}
        onClick={() => {
          onSave(provider, model.trim())
          setSaved(true)
        }}
      >
        {saved ? 'Saved' : 'Set'}
      </button>
      {!value && !saved && <span style={{ fontSize: 10, color: 'var(--pb-text-muted)', flexShrink: 0 }}>default</span>}
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

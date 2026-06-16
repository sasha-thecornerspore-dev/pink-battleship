import type { AssistantProvider } from '@shared/models'

export const ALL_PROVIDERS: AssistantProvider[] = [
  // Free local — the dependable baseline (runs on the creator's machine)
  { id: 'local', label: 'Local model (Ollama)', tier: 'free-local', explicitOk: true, local: true, trains: false, needsKey: false, blurb: 'Runs on your machine. Free, private, offline, explicit-capable.' },
  // Free hosted — SFW only, no GPU, free key
  { id: 'gemini', label: 'Google Gemini (AI Studio)', tier: 'free-hosted', explicitOk: false, local: false, trains: false, needsKey: true, blurb: 'Generous free tier, 1M context. SFW only.' },
  { id: 'groq', label: 'Groq', tier: 'free-hosted', explicitOk: false, local: false, trains: false, needsKey: true, blurb: 'Free tier, fastest latency. SFW only.' },
  { id: 'cerebras', label: 'Cerebras', tier: 'free-hosted', explicitOk: false, local: false, trains: false, needsKey: true, blurb: 'Free tier, highest throughput. SFW only.' },
  { id: 'openrouter_free', label: 'OpenRouter (free models)', tier: 'free-hosted', explicitOk: false, local: false, trains: false, needsKey: true, blurb: '30+ free models, one key. SFW only.' },
  // Paid — bring your own key
  { id: 'claude', label: 'Claude (Anthropic)', tier: 'paid', explicitOk: false, local: false, trains: false, needsKey: true, blurb: 'Premium SFW quality. Refuses explicit.' },
  { id: 'openai', label: 'OpenAI GPT', tier: 'paid', explicitOk: false, local: false, trains: false, needsKey: true, blurb: 'Premium SFW quality. Refuses explicit.' },
  { id: 'venice', label: 'Venice', tier: 'paid', explicitOk: true, local: false, trains: false, needsKey: true, blurb: 'Private, no-logs, uncensored. Explicit in the cloud.' },
  { id: 'openrouter', label: 'OpenRouter (uncensored)', tier: 'paid', explicitOk: true, local: false, trains: false, needsKey: true, blurb: 'Pay-per-token uncensored models.' },
  { id: 'atlas', label: 'Atlas Cloud', tier: 'paid', explicitOk: true, local: false, trains: false, needsKey: true, blurb: '300+ models, never trained on / never reviewed.' },
]

export interface RouteDecision {
  provider: AssistantProvider | null
  notes: string[]
}

/**
 * Pick a backend that respects the policy: explicit tasks never go to SFW-only
 * providers (protects the user's API account); anything with fan PII is forced to
 * a local, no-log backend; otherwise prefer local for privacy.
 */
export function pickProvider(opts: { explicit: boolean; hasPII: boolean; available: Set<string> }): RouteDecision {
  const notes: string[] = []
  let candidates = ALL_PROVIDERS.filter((p) => opts.available.has(p.id))

  if (opts.explicit) {
    candidates = candidates.filter((p) => p.explicitOk)
    notes.push('Explicit task → SFW providers (Claude/Groq) excluded; using an explicit-capable backend.')
  }
  if (opts.hasPII) {
    const safe = candidates.filter((p) => p.local && !p.trains)
    if (safe.length) {
      candidates = safe
      notes.push('Fan PII detected → forced to a local, no-log backend.')
    }
  }

  candidates = [...candidates].sort((a, b) => Number(b.local) - Number(a.local))
  return { provider: candidates[0] ?? null, notes }
}

import type { AssistantProvider } from '@shared/models'

export const ALL_PROVIDERS: AssistantProvider[] = [
  { id: 'local', label: 'Local model (uncensored)', explicitOk: true, local: true, trains: false },
  { id: 'venice', label: 'Venice — BYO key', explicitOk: true, local: false, trains: false },
  { id: 'claude', label: 'Claude — BYO key (SFW)', explicitOk: false, local: false, trains: false },
  { id: 'groq', label: 'Groq — free tier (SFW)', explicitOk: false, local: false, trains: false },
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

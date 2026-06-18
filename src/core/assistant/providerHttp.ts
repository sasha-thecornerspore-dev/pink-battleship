import type { AssistantTask, DraftRequest } from '@shared/models'

/**
 * One-shot HTTP generation config per hosted provider. Pure request builders +
 * response parsers — no network, no secrets. services.ts pulls the key from the
 * keychain, runs the request through the egress gateway (so every hosted call is
 * allowlisted and logged), then parses with these.
 *
 * Model IDs are sensible defaults; a wrong/unavailable id just fails the call and
 * the assistant falls back to the deterministic template (fail-safe, never throws
 * at the user).
 */
export interface ProviderHttp {
  host: string
  /** Default model id; a per-provider override (Settings → AI) takes precedence. */
  defaultModel: string
  build(key: string, prompt: string, model: string): { url: string; init: RequestInit }
  parse(json: unknown): string | null
}

const MAX_TOKENS = 600

const json = (key: string) => ({ Authorization: `Bearer ${key}`, 'content-type': 'application/json' })

/** OpenAI-compatible /chat/completions — Groq, Cerebras, OpenAI, Venice, OpenRouter, Atlas. */
function openAiCompatible(host: string, url: string, defaultModel: string): ProviderHttp {
  return {
    host,
    defaultModel,
    build: (key, prompt, model) => ({
      url,
      init: {
        method: 'POST',
        headers: json(key),
        body: JSON.stringify({ model, max_tokens: MAX_TOKENS, messages: [{ role: 'user', content: prompt }] }),
      },
    }),
    parse: (data) => {
      const j = data as { choices?: { message?: { content?: string } }[] }
      return j.choices?.[0]?.message?.content?.trim() || null
    },
  }
}

export const PROVIDER_HTTP: Record<string, ProviderHttp> = {
  // Free-hosted (SFW)
  gemini: {
    host: 'generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.0-flash',
    build: (key, prompt, model) => ({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      init: { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) },
    }),
    parse: (data) => {
      const j = data as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
      return j.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
    },
  },
  groq: openAiCompatible('api.groq.com', 'https://api.groq.com/openai/v1/chat/completions', 'llama-3.3-70b-versatile'),
  cerebras: openAiCompatible('api.cerebras.ai', 'https://api.cerebras.ai/v1/chat/completions', 'llama-3.3-70b'),
  openrouter_free: openAiCompatible('openrouter.ai', 'https://openrouter.ai/api/v1/chat/completions', 'meta-llama/llama-3.3-70b-instruct:free'),
  // Paid (SFW)
  claude: {
    host: 'api.anthropic.com',
    defaultModel: 'claude-3-5-haiku-latest',
    build: (key, prompt, model) => ({
      url: 'https://api.anthropic.com/v1/messages',
      init: {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: MAX_TOKENS, messages: [{ role: 'user', content: prompt }] }),
      },
    }),
    parse: (data) => {
      const j = data as { content?: { text?: string }[] }
      return j.content?.[0]?.text?.trim() || null
    },
  },
  openai: openAiCompatible('api.openai.com', 'https://api.openai.com/v1/chat/completions', 'gpt-4o-mini'),
  // Paid (explicit-capable)
  venice: openAiCompatible('api.venice.ai', 'https://api.venice.ai/api/v1/chat/completions', 'venice-uncensored'),
  openrouter: openAiCompatible('openrouter.ai', 'https://openrouter.ai/api/v1/chat/completions', 'cognitivecomputations/dolphin-mixtral-8x22b'),
  atlas: openAiCompatible('api.atlascloud.ai', 'https://api.atlascloud.ai/v1/chat/completions', 'meta-llama/Llama-3.3-70B-Instruct'),
}

/** Map of provider id → default model, for surfacing editable defaults in Settings. */
export function providerModelDefaults(): Record<string, string> {
  return Object.fromEntries(Object.entries(PROVIDER_HTTP).map(([id, cfg]) => [id, cfg.defaultModel]))
}

const TASK_INSTRUCTION: Record<AssistantTask, string> = {
  caption: 'Write a short, tasteful social caption for this content drop. One or two sentences.',
  fan_reply: 'Write a warm, flirty-but-classy reply to a fan message. Keep it personal and brief.',
  content_idea: 'Suggest one concrete content idea with a posting cadence (what to tease, what to drop, when).',
  legal: 'Provide general legal information — not legal advice — on the following. Note where the user should confirm jurisdiction-specific details with counsel.',
}

/** Frame the request as a single user-role prompt that works across all three response shapes. */
export function composePrompt(req: DraftRequest): string {
  const instruction = TASK_INSTRUCTION[req.task]
  const voice = req.persona?.trim() ? `\nVoice/persona: ${req.persona.trim()}` : ''
  return `${instruction}${voice}\n\n${req.context.trim()}`
}

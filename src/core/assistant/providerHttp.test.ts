import { describe, it, expect } from 'vitest'
import { PROVIDER_HTTP, composePrompt } from './providerHttp'
import { ALL_PROVIDERS } from './router'

describe('providerHttp', () => {
  it('has an HTTP config for every keyed provider', () => {
    for (const p of ALL_PROVIDERS) {
      if (p.needsKey) expect(PROVIDER_HTTP[p.id], `missing HTTP config for ${p.id}`).toBeDefined()
    }
  })

  it('builds an OpenAI-compatible request with a bearer token', () => {
    const { url, init } = PROVIDER_HTTP.groq.build('sk-test', 'hello')
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test')
    const body = JSON.parse(init.body as string)
    expect(body.messages[0].content).toBe('hello')
    expect(body.model).toBeTruthy()
  })

  it('parses OpenAI-compatible responses', () => {
    expect(PROVIDER_HTTP.groq.parse({ choices: [{ message: { content: '  drafted  ' } }] })).toBe('drafted')
    expect(PROVIDER_HTTP.groq.parse({ choices: [] })).toBeNull()
  })

  it('uses x-api-key + version header for Claude and never a bearer', () => {
    const { url, init } = PROVIDER_HTTP.claude.build('sk-ant', 'hi')
    const h = init.headers as Record<string, string>
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(h['x-api-key']).toBe('sk-ant')
    expect(h['anthropic-version']).toBeTruthy()
    expect(h.Authorization).toBeUndefined()
    expect(PROVIDER_HTTP.claude.parse({ content: [{ text: 'reply' }] })).toBe('reply')
  })

  it('passes the Gemini key in the query string, not a header', () => {
    const { url, init } = PROVIDER_HTTP.gemini.build('AIzaSecret', 'yo')
    expect(url).toContain('key=AIzaSecret')
    expect(init.headers as Record<string, string>).not.toHaveProperty('Authorization')
    expect(PROVIDER_HTTP.gemini.parse({ candidates: [{ content: { parts: [{ text: 'g' }] } }] })).toBe('g')
  })

  it('composePrompt frames the task and folds in the persona', () => {
    const p = composePrompt({ task: 'caption', context: 'blue set Friday', explicit: false, persona: 'playful' })
    expect(p).toContain('caption')
    expect(p).toContain('playful')
    expect(p).toContain('blue set Friday')
  })
})

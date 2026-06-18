import { describe, it, expect } from 'vitest'
import { PROVIDER_HTTP, providerModelDefaults, composePrompt } from './providerHttp'
import { ALL_PROVIDERS } from './router'

describe('providerHttp', () => {
  it('has an HTTP config + default model for every keyed provider', () => {
    const defaults = providerModelDefaults()
    for (const p of ALL_PROVIDERS) {
      if (p.needsKey) {
        expect(PROVIDER_HTTP[p.id], `missing HTTP config for ${p.id}`).toBeDefined()
        expect(defaults[p.id], `missing default model for ${p.id}`).toBeTruthy()
      }
    }
  })

  it('builds an OpenAI-compatible request with a bearer token and the chosen model', () => {
    const { url, init } = PROVIDER_HTTP.groq.build('sk-test', 'hello', 'my-custom-model')
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test')
    const body = JSON.parse(init.body as string)
    expect(body.messages[0].content).toBe('hello')
    expect(body.model).toBe('my-custom-model')
  })

  it('parses OpenAI-compatible responses', () => {
    expect(PROVIDER_HTTP.groq.parse({ choices: [{ message: { content: '  drafted  ' } }] })).toBe('drafted')
    expect(PROVIDER_HTTP.groq.parse({ choices: [] })).toBeNull()
  })

  it('uses x-api-key + version header for Claude (never a bearer) and honors the model', () => {
    const { url, init } = PROVIDER_HTTP.claude.build('sk-ant', 'hi', 'claude-3-opus-latest')
    const h = init.headers as Record<string, string>
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(h['x-api-key']).toBe('sk-ant')
    expect(h['anthropic-version']).toBeTruthy()
    expect(h.Authorization).toBeUndefined()
    expect(JSON.parse(init.body as string).model).toBe('claude-3-opus-latest')
    expect(PROVIDER_HTTP.claude.parse({ content: [{ text: 'reply' }] })).toBe('reply')
  })

  it('passes the Gemini key in the query string and the model in the path', () => {
    const { url, init } = PROVIDER_HTTP.gemini.build('AIzaSecret', 'yo', 'gemini-1.5-pro')
    expect(url).toContain('key=AIzaSecret')
    expect(url).toContain('models/gemini-1.5-pro:generateContent')
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

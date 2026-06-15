import { describe, it, expect } from 'vitest'
import { AssistantService } from './assistantService'
import { pickProvider } from './router'
import { screenContent, containsPII } from './safety'

describe('assistant safety', () => {
  it('hard-blocks prohibited categories on every backend', () => {
    expect(screenContent('underage content', []).allowed).toBe(false)
    expect(screenContent('a non-consent scene', []).allowed).toBe(false)
    expect(screenContent('blue lingerie teaser', []).allowed).toBe(true)
  })

  it('blocks by the creator boundary list', () => {
    expect(screenContent("let's do feet stuff", ['feet']).allowed).toBe(false)
    expect(screenContent("let's do lingerie", ['feet']).allowed).toBe(true)
  })

  it('detects PII', () => {
    expect(containsPII('dm me at fan@example.com')).toBe(true)
    expect(containsPII('just a normal message')).toBe(false)
  })
})

describe('assistant router', () => {
  it('excludes SFW providers for explicit tasks', () => {
    const r = pickProvider({ explicit: true, hasPII: false, available: new Set(['local', 'claude', 'groq']) })
    expect(r.provider?.explicitOk).toBe(true)
    expect(r.provider?.id).toBe('local')
  })

  it('forces a local backend when PII is present', () => {
    const r = pickProvider({ explicit: false, hasPII: true, available: new Set(['groq', 'local']) })
    expect(r.provider?.local).toBe(true)
  })
})

describe('AssistantService.draft', () => {
  it('drafts when allowed and reports the route', () => {
    const res = new AssistantService().draft({ task: 'caption', context: 'new blue lingerie set', explicit: false }, { boundaries: [] }, ['local', 'groq'])
    expect(res.ok).toBe(true)
    expect(res.text).toContain('blue lingerie')
    expect(res.route).toBeTruthy()
  })

  it('blocks disallowed content before any routing', () => {
    const res = new AssistantService().draft({ task: 'caption', context: 'underage', explicit: true }, { boundaries: [] }, ['local'])
    expect(res.ok).toBe(false)
    expect(res.blocked).toBeTruthy()
  })
})

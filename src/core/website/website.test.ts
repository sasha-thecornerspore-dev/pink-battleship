import { describe, it, expect } from 'vitest'
import { buildSite, esc, safeHref } from './siteBuilder'
import type { SiteConfig } from '@shared/models'

const base: SiteConfig = {
  handle: 'rosie',
  displayName: 'Rosie',
  tagline: 'cam + customs',
  bio: 'New drops every Friday.',
  links: [
    { label: 'OnlyFans', url: 'https://onlyfans.com/rosie' },
    { label: 'Chaturbate', url: 'https://chaturbate.com/rosie' },
  ],
  theme: 'blush',
  ageGate: true,
}

describe('siteBuilder', () => {
  it('renders the profile, links, and theme color', () => {
    const html = buildSite(base)
    expect(html).toContain('<title>Rosie</title>')
    expect(html).toContain('cam + customs')
    expect(html).toContain('href="https://onlyfans.com/rosie"')
    expect(html).toContain('#c98ba8') // blush primary
  })

  it('includes the 18+ age gate when enabled and omits it when not', () => {
    expect(buildSite(base)).toContain('18 years or older')
    expect(buildSite({ ...base, ageGate: false })).not.toContain('id="gate"')
  })

  it('drops links missing a label or url', () => {
    const html = buildSite({ ...base, links: [{ label: '', url: 'https://x.com' }, { label: 'Good', url: 'https://good.com' }] })
    expect(html).toContain('https://good.com')
    expect(html).not.toContain('https://x.com')
  })

  it('escapes user input so a bio cannot inject markup', () => {
    const html = buildSite({ ...base, bio: '<script>alert(1)</script>', displayName: 'A"B' })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('A&quot;B')
  })

  it('neutralizes javascript: and data: hrefs', () => {
    expect(safeHref('javascript:alert(1)')).toBe('#')
    expect(safeHref('data:text/html,<x>')).toBe('#')
    expect(safeHref('https://ok.com')).toBe('https://ok.com')
    expect(safeHref('mailto:me@x.com')).toBe('mailto:me@x.com')
  })

  it('esc covers all five HTML-significant characters', () => {
    expect(esc(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;')
  })
})

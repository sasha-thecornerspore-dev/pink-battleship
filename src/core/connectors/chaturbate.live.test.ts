import { describe, it, expect, vi } from 'vitest'
import { ChaturbateDriver } from './chaturbate'
import { NetworkGateway } from '../privacy/networkGateway'

const ALLOW = new Set(['eventsapi.chaturbate.com'])

describe('ChaturbateDriver (live, mocked fetch)', () => {
  it('polls the events URL via the gateway, parses tips, and advances nextUrl', async () => {
    const gateway = new NetworkGateway(ALLOW)
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          events: [{ method: 'tip', id: 'e1', timestamp: '2026-06-01T20:00:00Z', object: { tip: { tokens: 200 }, user: { username: 'liveuser' } } }],
          nextUrl: 'https://eventsapi.chaturbate.com/events/u/tok/?i=2',
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ events: [], nextUrl: 'https://eventsapi.chaturbate.com/events/u/tok/?i=3' }) })

    const driver = new ChaturbateDriver({
      gateway,
      eventsUrl: 'https://eventsapi.chaturbate.com/events/u/tok/',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      tokenValueUsd: 0.05,
    })

    const first = await driver.sync({ connectorId: 'chaturbate', platformId: 'chaturbate' })
    expect(first).toHaveLength(1)
    expect(first[0]).toMatchObject({ grossAmount: 10, payerRef: 'liveuser', kind: 'tip' })

    await driver.sync({ connectorId: 'chaturbate', platformId: 'chaturbate' })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(String(fetchImpl.mock.calls[1][0])).toContain('i=2')
  })

  it('fails closed when the events host is not allowlisted', async () => {
    const gateway = new NetworkGateway(ALLOW)
    const driver = new ChaturbateDriver({
      gateway,
      eventsUrl: 'https://evil.example.com/events/',
      fetchImpl: (async () => ({ ok: true, json: async () => ({ events: [] }) })) as unknown as typeof fetch,
    })
    await expect(driver.sync({ connectorId: 'c', platformId: 'chaturbate' })).rejects.toThrow()
  })
})

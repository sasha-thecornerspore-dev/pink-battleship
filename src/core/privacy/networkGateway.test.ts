import { describe, it, expect, vi } from 'vitest'
import { NetworkGateway, EgressBlockedError } from './networkGateway'
import type { EgressEntry } from '@shared/models'

describe('NetworkGateway', () => {
  it('allows an allowlisted host and logs the egress', async () => {
    const log: EgressEntry[] = []
    const gw = new NetworkGateway(new Set(['eventsapi.chaturbate.com']), (e) => log.push(e), () => '2026-06-13T00:00:00.000Z')
    const result = await gw.request({ host: 'eventsapi.chaturbate.com', purpose: 'poll-events' }, async () => 42)
    expect(result).toBe(42)
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({ host: 'eventsapi.chaturbate.com', purpose: 'poll-events' })
  })

  it('fails closed on a non-allowlisted host and never runs the request', async () => {
    const log: EgressEntry[] = []
    const gw = new NetworkGateway(new Set(['eventsapi.chaturbate.com']), (e) => log.push(e), () => 'ts')
    const fn = vi.fn(async () => 1)
    await expect(gw.request({ host: 'evil.example.com', purpose: 'exfil' }, fn)).rejects.toBeInstanceOf(EgressBlockedError)
    expect(fn).not.toHaveBeenCalled()
    expect(log[0].purpose).toContain('BLOCKED')
  })
})

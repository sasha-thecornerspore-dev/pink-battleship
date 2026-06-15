import { describe, it, expect } from 'vitest'
import { ChaturbateDriver, type ChaturbateEvent } from './chaturbate'
import fixture from './fixtures/chaturbate-events.json'

describe('ChaturbateDriver (mock)', () => {
  it('normalizes only tip events into USD transactions', async () => {
    const driver = new ChaturbateDriver({ mock: true, fixture: fixture as ChaturbateEvent[], tokenValueUsd: 0.05 })
    const txs = await driver.sync({ connectorId: 'c1', platformId: 'chaturbate' })

    expect(txs).toHaveLength(3) // 3 tips, chatMessage filtered out
    expect(txs[0]).toMatchObject({ platformId: 'chaturbate', kind: 'tip', currency: 'USD', payerRef: 'fan_a' })
    expect(txs[0].grossAmount).toBe(5) // 100 tokens * $0.05
    expect(txs[1].grossAmount).toBe(25) // 500 tokens
  })

  it('declares its risk label and data flow', () => {
    const driver = new ChaturbateDriver({ mock: true })
    expect(driver.riskLabel).toBe('official-low')
    expect(driver.dataFlows).toContain('eventsapi.chaturbate.com')
  })
})

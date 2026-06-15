import type { Connector, ConnectorContext } from './port'
import type { ConnectorStatus, Transaction } from '@shared/models'
import type { NetworkGateway } from '../privacy/networkGateway'

export const CHATURBATE_HOST = 'eventsapi.chaturbate.com'
const DEFAULT_TOKEN_USD = 0.05

export interface ChaturbateEvent {
  method: string
  id?: string
  timestamp?: string
  object: {
    tip?: { tokens: number; message?: string }
    user?: { username: string }
  }
}

export interface ChaturbateDriverOptions {
  mock?: boolean
  fixture?: ChaturbateEvent[]
  gateway?: NetworkGateway
  tokenValueUsd?: number
}

/**
 * Official Chaturbate driver. Fixture-first: in mock mode it normalizes a
 * recorded event list (no network), so the whole path is testable offline and
 * in CI. Live mode reaches the Events API only through the NetworkGateway.
 */
export class ChaturbateDriver implements Connector {
  readonly driver = 'official' as const
  readonly riskLabel = 'official-low' as const
  readonly dataFlows = [CHATURBATE_HOST]

  constructor(private readonly opts: ChaturbateDriverOptions = {}) {}

  private toTransaction(ev: ChaturbateEvent, ctx: ConnectorContext): Transaction | null {
    if (ev.method !== 'tip' || !ev.object.tip) return null
    const tokens = ev.object.tip.tokens
    const usd = Math.round(tokens * (this.opts.tokenValueUsd ?? DEFAULT_TOKEN_USD) * 100) / 100
    return {
      id: ev.id ?? `cb:${ev.timestamp ?? ''}:${ev.object.user?.username ?? ''}`,
      connectorId: ctx.connectorId,
      platformId: ctx.platformId,
      occurredAt: ev.timestamp ?? '',
      grossAmount: usd,
      currency: 'USD',
      kind: 'tip',
      externalId: ev.id ?? null,
      payerRef: ev.object.user?.username ?? null,
      raw: ev,
    }
  }

  async sync(ctx: ConnectorContext): Promise<Transaction[]> {
    const events = this.opts.mock ? (this.opts.fixture ?? []) : await this.fetchLive()
    return events
      .map((e) => this.toTransaction(e, ctx))
      .filter((t): t is Transaction => t !== null)
  }

  private async fetchLive(): Promise<ChaturbateEvent[]> {
    if (!this.opts.gateway) throw new Error('Chaturbate live mode requires a network gateway')
    return this.opts.gateway.request({ host: CHATURBATE_HOST, purpose: 'poll-events' }, async () => {
      // Live long-poll is wired in a later slice; for now the path is proven, not active.
      return []
    })
  }

  async healthCheck(): Promise<ConnectorStatus> {
    return this.opts.mock ? 'healthy' : 'needs_sync'
  }
}

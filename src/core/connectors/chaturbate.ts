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
  eventsUrl?: string
  fetchImpl?: typeof fetch
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
  private nextUrl?: string

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
    const url = this.nextUrl ?? this.opts.eventsUrl
    if (!url) throw new Error('Chaturbate live mode requires an events URL')
    const doFetch = this.opts.fetchImpl ?? fetch
    const host = new URL(url).hostname
    const data = await this.opts.gateway.request({ host, purpose: 'poll-events' }, async () => {
      const res = await doFetch(url)
      if (!res.ok) throw new Error(`Chaturbate events poll failed: ${res.status}`)
      return (await res.json()) as { events?: ChaturbateEvent[]; nextUrl?: string }
    })
    this.nextUrl = data.nextUrl
    return data.events ?? []
  }

  async healthCheck(): Promise<ConnectorStatus> {
    return this.opts.mock ? 'healthy' : 'needs_sync'
  }
}

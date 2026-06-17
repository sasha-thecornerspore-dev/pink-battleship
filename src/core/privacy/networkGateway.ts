import type { EgressEntry } from '@shared/models'

export type EgressLogger = (entry: EgressEntry) => void

export class EgressBlockedError extends Error {
  constructor(host: string) {
    super(`Blocked egress to non-allowlisted host: ${host}`)
    this.name = 'EgressBlockedError'
  }
}

export interface EgressRequest {
  host: string
  connectorId?: string | null
  purpose: string
}

/**
 * The single outbound network path. Any request to a host not on the allowlist
 * fails closed (throws) and is logged. This backs the "what leaves your machine"
 * inspector and the no-telemetry guarantee.
 */
export class NetworkGateway {
  constructor(
    private readonly allowlist: Set<string>,
    private readonly log: EgressLogger = () => {},
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  isAllowed(host: string): boolean {
    return this.allowlist.has(host)
  }

  /**
   * Open the gate for a host at the moment the user opts into reaching it (e.g.
   * generating with a hosted AI provider they hold a key for). The subsequent
   * request() call still logs the egress, so the "what leaves your machine"
   * inspector stays truthful.
   */
  allow(host: string): void {
    this.allowlist.add(host)
  }

  async request<T>(req: EgressRequest, fn: () => Promise<T>): Promise<T> {
    const base: EgressEntry = {
      ts: this.now(),
      connectorId: req.connectorId ?? null,
      host: req.host,
      purpose: req.purpose,
    }
    if (!this.allowlist.has(req.host)) {
      this.log({ ...base, purpose: `BLOCKED: ${req.purpose}` })
      throw new EgressBlockedError(req.host)
    }
    this.log(base)
    return fn()
  }
}

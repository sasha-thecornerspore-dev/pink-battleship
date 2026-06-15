import type { ConnectorStatus, DriverKind, RiskLabel, Transaction } from '@shared/models'

export interface ConnectorContext {
  connectorId: string
  platformId: string
}

/**
 * One connector abstraction, swappable drivers. Official drivers reach the
 * network only via the NetworkGateway and declare their dataFlows. Manual
 * drivers declare no dataFlows (nothing leaves the machine).
 */
export interface Connector {
  readonly driver: DriverKind
  readonly riskLabel: RiskLabel
  readonly dataFlows: string[]
  sync(ctx: ConnectorContext): Promise<Transaction[]>
  healthCheck(): Promise<ConnectorStatus>
}

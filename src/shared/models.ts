export type PlatformId = string

export interface Platform {
  id: PlatformId
  name: string
  kind: 'cam' | 'subscription' | 'clips' | 'directory'
}

export type DriverKind = 'official' | 'manual'
export type RiskLabel = 'official-low' | 'manual-none' | 'unofficial-high'
export type ConnectorStatus = 'healthy' | 'needs_sync' | 'broken'

export interface ConnectorInfo {
  id: string
  platformId: PlatformId
  driver: DriverKind
  riskLabel: RiskLabel
  status: ConnectorStatus
  lastSyncAt: string | null
}

export type TransactionKind = 'tip' | 'sub' | 'ppv' | 'clip' | 'other'

export interface Transaction {
  id: string
  connectorId: string
  platformId: PlatformId
  occurredAt: string
  grossAmount: number
  currency: string
  kind: TransactionKind
  externalId: string | null
  payerRef: string | null
  raw?: unknown
}

export type RateKind = 'platform_cut' | 'processor_fee'

export interface RateRule {
  id: string
  platformId: PlatformId
  kind: RateKind
  rate: number
  fixedFee: number
  effectiveFrom: string
  effectiveTo: string | null
  note?: string
  isEstimate: boolean
}

export interface PlatformBreakdown {
  platformId: PlatformId
  driver: DriverKind
  gross: number
  net: number
}

export interface PnlSummary {
  gross: number
  fees: number
  net: number
  activeFans: number
  byPlatform: PlatformBreakdown[]
  dailyNet: { date: string; net: number }[]
}

export interface EgressEntry {
  ts: string
  connectorId: string | null
  host: string
  purpose: string
}

export type FanTier = 'whale' | 'vip' | 'regular'

export interface Fan {
  id: string
  platformId: PlatformId
  payerRef: string
  totalGross: number
  totalNet: number
  txCount: number
  lastSeen: string
  tier: FanTier
  note: string
}

export type ThemeId = 'blush' | 'lavender' | 'rose'
export type ThemeMode = 'light' | 'dark'

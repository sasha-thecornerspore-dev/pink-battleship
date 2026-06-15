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

export interface EarningsPoint {
  date: string
  net: number
  ma: number
}

export interface HeatCell {
  dow: number
  hour: number
  net: number
}

export interface StatsSummary {
  totalNet: number
  activeDays: number
  avgPerActiveDay: number
  bestDay: { date: string; net: number } | null
  bestHour: { dow: number; hour: number; net: number } | null
}

export interface StatsReport {
  series: EarningsPoint[]
  heatmap: HeatCell[]
  summary: StatsSummary
}

export type GalleryKind = 'master' | 'set'

export interface Gallery {
  id: string
  name: string
  kind: GalleryKind
  createdAt: string
  assetCount: number
}

export type AssetMediaKind = 'image' | 'video'

export interface Asset {
  id: string
  galleryId: string
  filename: string
  mediaKind: AssetMediaKind
  nsfw: boolean
  tags: string[]
  postedTo: string[]
  dims: string
  addedAt: string
}

export type AssistantTask = 'caption' | 'fan_reply' | 'content_idea'

export interface AssistantProvider {
  id: string
  label: string
  explicitOk: boolean
  local: boolean
  trains: boolean
}

export interface AssistantConfig {
  boundaries: string[]
}

export interface DraftRequest {
  task: AssistantTask
  context: string
  explicit: boolean
  persona?: string
}

export interface DraftResult {
  ok: boolean
  blocked?: string
  route?: string
  routeLabel?: string
  text?: string
  notes: string[]
}

export type ThemeId = 'blush' | 'lavender' | 'rose'
export type ThemeMode = 'light' | 'dark'

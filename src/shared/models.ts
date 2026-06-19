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
  daysSinceSeen: number
  lapsed: boolean
}

export interface FanTxn {
  occurredAt: string
  grossAmount: number
  net: number
  kind: TransactionKind
}

export interface FanDetail {
  fan: Fan
  firstSeen: string
  lastSeen: string
  /** Net per transaction kind, e.g. { tip: 120, ppv: 80 }. */
  byKind: Record<string, number>
  /** This fan's transactions, newest first. */
  transactions: FanTxn[]
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
  /** Absolute path to the original file (reference-in-place — the app never copies the bytes). */
  sourcePath?: string
  /** Size of the original file, bytes. */
  sizeBytes?: number
  /** Video length in seconds (images: undefined). */
  durationSeconds?: number
  /** Custom-protocol URL (pbthumb://…) for a generated thumbnail, when one exists. */
  thumb?: string
}

export type AssistantTask = 'caption' | 'fan_reply' | 'content_idea' | 'legal'

export type ProviderTier = 'free-local' | 'free-hosted' | 'paid'

export interface AssistantProvider {
  id: string
  label: string
  tier: ProviderTier
  explicitOk: boolean
  local: boolean
  trains: boolean
  needsKey: boolean
  blurb: string
}

export interface AssistantConfig {
  boundaries: string[]
}

export interface AssistantConfigResult {
  boundaries: string[]
  providers: AssistantProvider[]
  available: string[]
  localModel: string
  /** Per-provider model overrides the user has saved (id → model). */
  models: Record<string, string>
  /** Built-in default model per hosted provider (id → model). */
  modelDefaults: Record<string, string>
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

export type ScheduleKind = 'post' | 'mass_dm' | 'go_live' | 'promo'
export type ScheduleStatus = 'planned' | 'posted' | 'skipped'

export interface ScheduledItem {
  id: string
  platformId: string
  kind: ScheduleKind
  title: string
  caption: string
  scheduledAt: string
  status: ScheduleStatus
}

export interface TwoFiveSevenRecord {
  id: string
  legalName: string
  aliases: string
  dob: string
  idType: string
  idRef: string
  productionDates: string
  addedAt: string
}

export interface ComplianceOverview {
  records: TwoFiveSevenRecord[]
  custodian: { name: string; address: string }
  custodianStatement: string
  tax: { net: number; rate: number; setAside: number }
}

export interface DmcaInput {
  workTitle: string
  infringingUrl: string
  originalUrl: string
  name: string
}

export type ThemeId = 'blush' | 'lavender' | 'rose'
export type ThemeMode = 'light' | 'dark'

// --- Website builder (link-in-bio, generated locally) ---

export interface SiteLink {
  label: string
  url: string
}

export interface SiteConfig {
  handle: string
  displayName: string
  tagline: string
  bio: string
  links: SiteLink[]
  theme: ThemeId
  ageGate: boolean
}

// --- OBS (local studio control via obs-websocket v5, 127.0.0.1) ---

export interface ObsStatus {
  connected: boolean
  streaming: boolean
  recording: boolean
  streamSeconds: number
  currentScene: string
  scenes: string[]
  /** Set when a connect attempt failed — a friendly, actionable reason. */
  error?: string
}

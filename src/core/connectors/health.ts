import type { ConnectorStatus } from '@shared/models'

export interface HealthState {
  status: ConnectorStatus
  lastSyncAt: string | null
  lastError: string | null
}

export function initialHealth(): HealthState {
  return { status: 'needs_sync', lastSyncAt: null, lastError: null }
}

export function onSyncSuccess(_prev: HealthState, at: string): HealthState {
  return { status: 'healthy', lastSyncAt: at, lastError: null }
}

export function onSyncFailure(prev: HealthState, error: string): HealthState {
  return { status: 'broken', lastSyncAt: prev.lastSyncAt, lastError: error }
}

/** A broken connector must not be auto-retried — fail safe to manual-assist. */
export function shouldAutoSync(state: HealthState): boolean {
  return state.status !== 'broken'
}

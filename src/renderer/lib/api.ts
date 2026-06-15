import { useQuery } from '@tanstack/react-query'
import type { PbApiContract } from '@shared/ipc'
import { createDemoBackend } from './demoBackend'

// In Electron the preload sets window.pb. In a plain browser (the prototype),
// fall back to the in-memory demo backend running the same core logic.
export const pb: PbApiContract = window.pb ?? createDemoBackend()

export function money(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export const qk = {
  vaultStatus: ['vault-status'] as const,
  pnl: ['pnl'] as const,
  connectors: ['connectors'] as const,
  rates: ['rates'] as const,
  privacy: ['privacy'] as const,
  fans: ['fans'] as const,
  stats: ['stats'] as const,
  galleries: ['galleries'] as const,
}

export const usePnl = () => useQuery({ queryKey: qk.pnl, queryFn: () => pb.pnl.summary() })
export const useConnectors = () => useQuery({ queryKey: qk.connectors, queryFn: () => pb.connectors.list() })
export const useRates = () => useQuery({ queryKey: qk.rates, queryFn: () => pb.rates.list() })
export const usePrivacy = () => useQuery({ queryKey: qk.privacy, queryFn: () => pb.privacy.dataFlows() })
export const useFans = () => useQuery({ queryKey: qk.fans, queryFn: () => pb.fans.list() })
export const useStats = () => useQuery({ queryKey: qk.stats, queryFn: () => pb.stats.report() })

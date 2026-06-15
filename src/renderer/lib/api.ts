import { useQuery } from '@tanstack/react-query'

export const pb = window.pb

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
}

export const usePnl = () => useQuery({ queryKey: qk.pnl, queryFn: () => pb.pnl.summary() })
export const useConnectors = () => useQuery({ queryKey: qk.connectors, queryFn: () => pb.connectors.list() })
export const useRates = () => useQuery({ queryKey: qk.rates, queryFn: () => pb.rates.list() })
export const usePrivacy = () => useQuery({ queryKey: qk.privacy, queryFn: () => pb.privacy.dataFlows() })

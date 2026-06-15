import type { PbApiContract } from '@shared/ipc'

declare global {
  interface Window {
    pb?: PbApiContract
  }
}

export {}

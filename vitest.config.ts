import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@core': resolve('src/core'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/core/**/*.test.ts', 'src/main/**/*.test.ts', 'scripts/**/*.test.mjs'],
  },
})

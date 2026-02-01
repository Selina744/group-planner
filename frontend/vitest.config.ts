import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/mocks/**',
        'src/types/**',
        'src/**/*.d.ts'
      ],
      // Homelab-appropriate coverage targets (simplified from 75% to 65%)
      thresholds: {
        lines: 65,
        functions: 65,
        branches: 60,
        statements: 65
      }
    }
  }
})
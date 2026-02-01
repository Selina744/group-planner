import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    clearMocks: true,
    setupFiles: ['src/tests/setup.ts'],
    include: ['src/tests/**/*.test.ts'],
    exclude: [
      'node_modules',
      'dist',
      'src/tests/utils/**',
      'src/tests/fixtures/**',
      'src/tests/setup.ts'
    ],
    // Disable worker pools to avoid Bun compatibility issues
    threads: false,
    isolate: false,
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 30000, // 30 seconds for setup/teardown hooks
    env: loadEnv('test', process.cwd(), '')
  },
  esbuild: {
    target: 'node20'
  },
  define: {
    'process.env.NODE_ENV': '"test"'
  }
});
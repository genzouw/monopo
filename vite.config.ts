/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/monopo/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: [['text', { maxCols: 150 }], 'json-summary', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.test.*',
        'src/test-setup.ts',
        'src/main.tsx',
      ],
      thresholds: {
        lines: 45,
        functions: 26,
        branches: 34,
        statements: 45,
      },
    },
  },
})

/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: '/monopo/',
  plugins: [
    react(),
    command === 'serve'
      ? {
          name: 'strip-csp-in-dev',
          transformIndexHtml(html: string): string {
            // CSP meta tag blocks Vite's React Fast Refresh inline script in dev mode
            return html.replace(
              /<meta[^>]*http-equiv="Content-Security-Policy"[^>]*>/gi,
              '',
            );
          },
        }
      : null,
  ],
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
}));

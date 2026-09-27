import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
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
    // e2e/ は Playwright で実行するため vitest の対象から外す
    exclude: [...configDefaults.exclude, 'dist/**', 'e2e/**'],
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

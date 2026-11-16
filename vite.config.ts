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
        'src/test-utils.ts',
        'src/main.tsx',
      ],
      thresholds: {
        // 実測値が閾値を上回ったら、切り捨てて 1 ポイントの余裕を残した値へ閾値を引き上げる。
        // 分岐カバレッジが実行ごとに小数点以下で揺れるため余裕を残す。
        // Math.max で前回値を下回らないようにし、閾値が下がる方向には更新しない。
        // CI ランナー上で書き換えても結果に残らないため、CI では無効にする
        autoUpdate: process.env.CI
          ? false
          : (newThreshold: number, previousThreshold: number): number =>
              Math.max(previousThreshold, Math.floor(newThreshold) - 1),
        lines: 73,
        functions: 58,
        branches: 60,
        statements: 71,
      },
    },
  },
}));

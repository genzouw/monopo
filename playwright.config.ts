import { defineConfig, devices } from '@playwright/test';

/**
 * 本番ビルド (`dist/`) を `vite preview` で配信し、実ブラウザで起動確認する
 * E2E スモークテストの設定。事前に `bun run build` が必要。
 */
export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173/monopo/',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun run preview',
    url: 'http://localhost:4173/monopo/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

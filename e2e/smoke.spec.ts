import { test, expect } from '@playwright/test';

test('本番ビルドがブラウザで描画され、コンソールエラーが出ない', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('./');

  // #root が空のままなら白画面（CSP 違反・バンドル破損など）
  await expect(page.locator('#root')).not.toBeEmpty();
  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

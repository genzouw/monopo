import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

// 検査対象は WCAG 2.1 の A / AA 相当のルールに限る
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test('起動直後の画面に WCAG 2.1 A/AA 違反がない', async ({ page }) => {
  await page.goto('./');

  // 描画前に解析すると空の DOM を検査してしまうため、#root の描画を待つ
  await expect(page.locator('#root')).not.toBeEmpty();

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  // 失敗時は違反ルール ID と件数を一覧で示し、詳細はメッセージに JSON で出す
  expect(
    results.violations.map((v) => `${v.id} (${v.nodes.length} node(s))`),
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
});

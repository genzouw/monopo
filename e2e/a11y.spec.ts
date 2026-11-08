import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;
type AxeViolation = AxeResults['violations'][number];
type AxeNode = AxeViolation['nodes'][number];

// 検査対象は WCAG 2.1 の A / AA 相当のルールに限る
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// 既知の違反: --color-primary (#ff6b6b) を使う文字・ボタンのコントラスト不足。
// 配色の決定待ちのため一時的に許容する (追跡: #886)。
// ルールごと無効化すると他の色のコントラスト回帰も見逃すため、この色を含むノードだけを除外する。
const KNOWN_LOW_CONTRAST_COLOR = '#ff6b6b';

/**
 * color-contrast 違反のノードが、既知の低コントラスト色によるものかを判定する。
 * @param node axe が報告した違反ノード
 * @returns 前景色か背景色が既知の色であれば true
 */
function isKnownLowContrast(node: AxeNode): boolean {
  return node.any.some(
    (check) =>
      check.id === 'color-contrast' &&
      [check.data?.fgColor, check.data?.bgColor].includes(
        KNOWN_LOW_CONTRAST_COLOR,
      ),
  );
}

/**
 * 既知の違反ノードを取り除き、ノードが残った違反だけを返す。
 * @param violations axe が報告した違反の一覧
 * @returns 許容しない違反の一覧
 */
function withoutKnownViolations(violations: AxeViolation[]): AxeViolation[] {
  return violations
    .map((v) =>
      v.id === 'color-contrast'
        ? { ...v, nodes: v.nodes.filter((n) => !isKnownLowContrast(n)) }
        : v,
    )
    .filter((v) => v.nodes.length > 0);
}

test('起動直後の画面に WCAG 2.1 A/AA 違反がない', async ({ page }) => {
  await page.goto('./');

  // 描画前に解析すると空の DOM を検査してしまうため、#root の描画を待つ
  await expect(page.locator('#root')).not.toBeEmpty();

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const violations = withoutKnownViolations(results.violations);

  // 失敗時は違反ルール ID と件数を一覧で示し、詳細はメッセージに JSON で出す
  expect(
    violations.map((v) => `${v.id} (${v.nodes.length} node(s))`),
    JSON.stringify(violations, null, 2),
  ).toEqual([]);
});

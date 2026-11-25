import '@testing-library/jest-dom/vitest';
import fc from 'fast-check';
import { afterEach, beforeEach } from 'vitest';

// プロパティテストは既定でシードを固定し、結果をコミットだけで決まるようにする。
// 定期実行（property-explore.yml）は FC_SEED=random で毎回別の入力を探索する。
// 反例の再現は、ログのシードを FC_SEED に渡して実行する
const seed = import.meta.env.FC_SEED as string | undefined;
const numRuns = import.meta.env.FC_NUM_RUNS as string | undefined;
fc.configureGlobal({
  ...fc.readConfigureGlobal(),
  ...(seed === 'random' ? {} : { seed: Number(seed ?? 42) }),
  ...(numRuns ? { numRuns: Number(numRuns) } : {}),
});

// テスト中の console.error / console.warn を記録し、1 件でもあればそのテストを失敗させる。
// React の実行時警告（キーの重複、不正な要素の入れ子など）は console.error で出るため、
// 握りつぶさずに CI で検出する。警告を意図的に出すテストは、そのテスト内で
// vi.spyOn(console, 'error').mockImplementation(() => {}) を使って抑止する。
// vi.spyOn ではなく直接差し替えるのは、テスト側の vi.restoreAllMocks() で外れないようにするため
const consoleMessages: string[] = [];
const originalConsole = { error: console.error, warn: console.warn };

beforeEach(() => {
  consoleMessages.length = 0;
  console.error = (...args: unknown[]) => {
    consoleMessages.push(`console.error: ${args.map(String).join(' ')}`);
  };
  console.warn = (...args: unknown[]) => {
    consoleMessages.push(`console.warn: ${args.map(String).join(' ')}`);
  };
});

afterEach(() => {
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  const messages = consoleMessages.splice(0);
  if (messages.length > 0) {
    throw new Error(`unexpected console output:\n${messages.join('\n')}`);
  }
});

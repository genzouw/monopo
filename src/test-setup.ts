import '@testing-library/jest-dom/vitest';
import fc from 'fast-check';
import { afterEach, beforeEach, vi } from 'vitest';

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

// gameReducer に渡す状態を再帰的に凍結し、reducer が入力の状態を書き換えたら TypeError で失敗させる。
// 書き換えは React の再描画漏れや、Strict Mode での二重適用の原因になる。
// このファイルで src/game/reducer を import すると、モックが効かなくなる（Vitest の仕様）。

/**
 * 値がまだ凍結されていないオブジェクト（配列を含む）かを判定する。
 *
 * @param value - 判定する値
 * @returns 未凍結のオブジェクトなら true
 */
function isUnfrozenObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Object.isFrozen(value);
}

/**
 * オブジェクトと、その子のオブジェクト・配列をすべて凍結する。
 *
 * @param value - 凍結する値。プリミティブはそのまま返す
 * @returns 凍結した value
 */
function deepFreeze<T>(value: T): T {
  if (isUnfrozenObject(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

vi.mock('./game/reducer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./game/reducer')>();
  return {
    ...actual,
    gameReducer: (...[state, action]: Parameters<typeof actual.gameReducer>) =>
      actual.gameReducer(deepFreeze(state), action),
  };
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

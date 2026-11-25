import '@testing-library/jest-dom/vitest';
import fc from 'fast-check';
import { vi } from 'vitest';

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
 * オブジェクトと、その子のオブジェクト・配列をすべて凍結する。
 *
 * @param value - 凍結する値。プリミティブはそのまま返す
 * @returns 凍結した value
 */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
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

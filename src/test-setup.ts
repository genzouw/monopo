import '@testing-library/jest-dom/vitest';
import fc from 'fast-check';

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

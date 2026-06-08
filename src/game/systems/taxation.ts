// Phase 3: 累進課税・公共基金・再分配の純粋計算関数層
// reducer.ts を肥大化させないため、課税ロジックはここに集約する。
// 既存ゲーム挙動を破壊しないよう、本ファイルの関数はすべて副作用なしの計算関数として実装する。

import type { GameState } from '../types';

// 累進税率ブラケット（昇順）: { threshold: 資産上限（未満）, rate: 税率 }
export const PROGRESSIVE_TAX_BRACKETS: Array<{
  threshold: number;
  rate: number;
}> = [
  { threshold: 3000, rate: 0 },
  { threshold: 6000, rate: 0.1 },
  { threshold: 10000, rate: 0.25 },
  { threshold: Infinity, rate: 0.4 },
];

// 公共基金がこの額に達すると再分配が発動する
export const PUBLIC_FUND_REDISTRIBUTION_THRESHOLD = 500;

/**
 * 累進課税額を計算する純粋関数。
 *
 * `PROGRESSIVE_TAX_BRACKETS` を昇順に走査し、`totalAssets < threshold` となる
 * 最初のブラケットの税率を `dividend` に乗じて切り捨て（floor）した値を返す。
 * `dividend <= 0` のときは無条件で 0 を返す。
 *
 * @param dividend 社会配当額（GOマス通過時の収入）。
 * @param totalAssets プレイヤーの総資産（現金＋物件価値）。
 * @returns 税額（切り捨て）。`dividend` を超えない。
 */
export function calculateProgressiveTax(
  dividend: number,
  totalAssets: number,
): number {
  if (dividend <= 0) return 0;
  for (const bracket of PROGRESSIVE_TAX_BRACKETS) {
    if (totalAssets < bracket.threshold) {
      return Math.floor(dividend * bracket.rate);
    }
  }
  return Math.floor(
    dividend *
      PROGRESSIVE_TAX_BRACKETS[PROGRESSIVE_TAX_BRACKETS.length - 1].rate,
  );
}

/**
 * 公共基金から再分配する金額を計算する純粋関数。
 *
 * `publicFund < PUBLIC_FUND_REDISTRIBUTION_THRESHOLD` の場合は 0 を返す。
 * 閾値以上の場合は `Math.floor(publicFund / 2)` を返す（基金の半額を再分配）。
 *
 * @param publicFund 現在の公共基金残高。
 * @returns 再分配する金額。`publicFund` を超えない。
 */
export function calculatePublicFundRedistribution(publicFund: number): number {
  if (publicFund < PUBLIC_FUND_REDISTRIBUTION_THRESHOLD) return 0;
  return Math.floor(publicFund / 2);
}

/**
 * progressiveTax 機能が有効かどうかを判定する。
 *
 * `state.features?.progressiveTax === true` のときのみ `true` を返す。
 */
export function isProgressiveTaxEnabled(state: GameState): boolean {
  return state.features?.progressiveTax === true;
}

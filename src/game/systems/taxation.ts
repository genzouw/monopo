// 累進課税・公共基金・節税アクションの純粋計算関数層
// GOマス通過時の累進課税と、寄付による課税所得控除（節税）を実装する。
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

// 配当額に対して寄付できる最大割合（30%）
// 寄付した分は課税対象から外れる（節税アクション）
export const MAX_DONATION_RATE = 0.3;

/**
 * progressiveTax 機能が有効かどうかを判定する。
 */
export function isProgressiveTaxEnabled(state: GameState): boolean {
  return state.features?.progressiveTax === true;
}

/**
 * 寄付控除後の課税対象収入を計算する純粋関数。
 *
 * 寄付額は `floor(dividend * MAX_DONATION_RATE)` でキャップする。
 * `dividend <= 0` のときは無条件で 0 を返す。
 *
 * @param dividend 社会配当額（GOマス通過時の収入）。
 * @param donationAmount プレイヤーが寄付する金額（公共基金へ）。
 * @returns 課税対象収入（配当 - 実際の寄付額控除）。
 */
export function calculateTaxableIncome(
  dividend: number,
  donationAmount: number,
): number {
  if (dividend <= 0) return 0;
  const maxDeductible = Math.floor(dividend * MAX_DONATION_RATE);
  const actualDeduction = Math.min(donationAmount, maxDeductible);
  return dividend - actualDeduction;
}

/**
 * 累進課税額を計算する純粋関数。
 *
 * `PROGRESSIVE_TAX_BRACKETS` を昇順に走査し、`totalAssets < threshold` となる
 * 最初のブラケットの税率を `taxableIncome` に乗じて切り捨てた値を返す。
 * `taxableIncome <= 0` のときは無条件で 0 を返す。
 *
 * @param taxableIncome 課税対象収入（calculateTaxableIncome の結果を渡す）。
 * @param totalAssets プレイヤーの総資産（現金＋物件価値）。
 * @returns 税額（切り捨て）。
 */
export function calculateProgressiveTax(
  taxableIncome: number,
  totalAssets: number,
): number {
  if (taxableIncome <= 0) return 0;
  for (const bracket of PROGRESSIVE_TAX_BRACKETS) {
    if (totalAssets < bracket.threshold) {
      return Math.floor(taxableIncome * bracket.rate);
    }
  }
  return Math.floor(
    taxableIncome *
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

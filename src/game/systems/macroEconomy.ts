// Phase 2-a: マクロ経済サイクルの純粋計算関数層
// reducer.ts を肥大化させないため、景気遷移・乗数計算はここに集約する。
// 既存ゲーム挙動を破壊しないよう、本ファイルの関数はすべて副作用なしの計算関数として実装する。

import type { EconomyStatus, GameState } from '../types';

// 景気乗数（仕様: 好況=1.3、通常=1.0、不況=0.7、金融危機=0.4）
export const ECONOMY_FACTORS: Record<EconomyStatus, number> = {
  boom: 1.3,
  normal: 1.0,
  recession: 0.7,
  crisis: 0.4,
};

// クランプ範囲（仕様: 0.3〜2.0）
export const ECONOMY_FACTOR_MIN = 0.3;
export const ECONOMY_FACTOR_MAX = 2.0;

// 景気更新間隔（ターン数）
export const ECONOMY_UPDATE_INTERVAL = 5;

// 景気遷移確率マトリクス: [現在の状態][次の状態] = 確率
// 各行の合計 = 1.0。好況→金融危機、金融危機→好況への直接遷移は0。
export const ECONOMY_TRANSITION_MATRIX: Record<
  EconomyStatus,
  Record<EconomyStatus, number>
> = {
  boom: { boom: 0.5, normal: 0.4, recession: 0.1, crisis: 0.0 },
  normal: { boom: 0.2, normal: 0.5, recession: 0.25, crisis: 0.05 },
  recession: { boom: 0.0, normal: 0.35, recession: 0.5, crisis: 0.15 },
  crisis: { boom: 0.0, normal: 0.1, recession: 0.5, crisis: 0.4 },
};

/**
 * ランダム値から遷移先の景気ステータスを決定する純粋関数。
 *
 * `ECONOMY_TRANSITION_MATRIX[current]` の各遷移確率を累積し、
 * `random` がその累積確率を超えた最初の状態を返す。確率 0 の状態はスキップする。
 *
 * `random` が累積確率の合計（理論上は 1.0）を超えてしまうエッジケース
 * （浮動小数点誤差で 1.0 直前を引いた場合など）では、ループ中に出現した
 * 最後の `prob > 0` の状態を返す。これにより `random ∈ [0, 1]` の範囲で
 * 確率 0 ではない遷移先が必ず返ることが保証される。
 *
 * @param current 現在の景気ステータス。
 * @param random `[0, 1)` の範囲の乱数（呼び出し側で生成）。累積選択に使用する。
 * @returns 次の景気ステータス。
 */
export function transitionEconomy(
  current: EconomyStatus,
  random: number,
): EconomyStatus {
  const transitions = ECONOMY_TRANSITION_MATRIX[current];
  let cumulative = 0;
  let lastValidStatus = current;
  for (const [status, prob] of Object.entries(transitions) as [
    EconomyStatus,
    number,
  ][]) {
    if (prob <= 0) continue;
    cumulative += prob;
    lastValidStatus = status;
    if (random < cumulative) return status;
  }
  return lastValidStatus;
}

/**
 * 景気乗数を適用して金額を補正する。
 *
 * `ECONOMY_FACTORS[status]` を `baseAmount` に乗じ、`Math.floor` で切り捨てる。
 * 結果は仕様クランプ範囲
 * `Math.floor(baseAmount * ECONOMY_FACTOR_MIN)` 〜
 * `Math.floor(baseAmount * ECONOMY_FACTOR_MAX)` に収まるよう調整する。
 * `baseAmount === 0` のときは無条件で 0 を返す。
 *
 * @param baseAmount 補正前の基準金額（整数想定、負値も許容）。
 * @param status 現在の景気ステータス。
 * @returns 景気補正後の金額（切り捨て・クランプ済み）。
 */
export function applyEconomyFactor(
  baseAmount: number,
  status: EconomyStatus,
): number {
  if (baseAmount === 0) return 0;
  const factor = ECONOMY_FACTORS[status];
  const adjusted = Math.floor(baseAmount * factor);
  const min = Math.floor(baseAmount * ECONOMY_FACTOR_MIN);
  const max = Math.floor(baseAmount * ECONOMY_FACTOR_MAX);
  return Math.max(min, Math.min(max, adjusted));
}

/**
 * 指定ターン数で景気更新が発生するかどうかを判定する。
 *
 * `turnCount === 0`（初期状態）では更新を発生させない。
 * `turnCount > 0` かつ `turnCount % ECONOMY_UPDATE_INTERVAL === 0` のときに `true` を返す。
 *
 * @param turnCount 現在のターン数（0 以上の整数）。
 * @returns 景気を更新するべきタイミングなら `true`。
 */
export function shouldUpdateEconomy(turnCount: number): boolean {
  return turnCount > 0 && turnCount % ECONOMY_UPDATE_INTERVAL === 0;
}

/**
 * macroEconomy 機能が有効かどうかを判定する。
 *
 * `state.features?.macroEconomy === true` のときのみ `true` を返す。
 * 機能フラグが未定義／false の場合は既存挙動互換のため `false`。
 *
 * @param state 現在のゲーム状態。
 * @returns macroEconomy が有効なら `true`。
 */
export function isMacroEconomyEnabled(state: GameState): boolean {
  return state.features?.macroEconomy === true;
}

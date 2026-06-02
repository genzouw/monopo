// Phase 2-a: マクロ経済サイクルの純粋計算関数層
// reducer.ts を肥大化させないため、景気遷移・乗数計算はここに集約する。
// 既存ゲーム挙動を破壊しないよう、本ファイルの関数はすべて副作用なしの計算関数として実装する。

import type { ColorGroupStock, EconomyStatus, GameState } from '../types';

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

// ランダム値[0, 1)から遷移先の景気ステータスを決定する純粋関数。
// 確率0の状態はスキップし、各状態の累積確率を超えた最初の状態を返す。
export function transitionEconomy(
  current: EconomyStatus,
  random: number,
): EconomyStatus {
  const transitions = ECONOMY_TRANSITION_MATRIX[current];
  let cumulative = 0;
  for (const [status, prob] of Object.entries(transitions) as [
    EconomyStatus,
    number,
  ][]) {
    if (prob <= 0) continue;
    cumulative += prob;
    if (random < cumulative) return status;
  }
  return current;
}

// 景気乗数を適用して金額を補正する（切り捨て、仕様クランプ範囲内）
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

// 指定ターン数で景気更新が発生するかどうか（0ターン目は初期状態なので更新しない）
export function shouldUpdateEconomy(turnCount: number): boolean {
  return turnCount > 0 && turnCount % ECONOMY_UPDATE_INTERVAL === 0;
}

// macroEconomy機能が有効かどうか
export function isMacroEconomyEnabled(state: GameState): boolean {
  return state.features?.macroEconomy === true;
}

// 金融危機イベント: 全エリア株価を一律50%減（最低価格1を保証）
export function applyFinancialCrisisToStocks(
  stockMarket: Partial<Record<string, ColorGroupStock>> | undefined,
): Partial<Record<string, ColorGroupStock>> | undefined {
  if (!stockMarket) return stockMarket;
  const newMarket = { ...stockMarket };
  for (const color of Object.keys(newMarket)) {
    const stock = newMarket[color];
    if (stock) {
      newMarket[color] = {
        ...stock,
        pricePerShare: Math.max(Math.floor(stock.pricePerShare * 0.5), 1),
      };
    }
  }
  return newMarket;
}

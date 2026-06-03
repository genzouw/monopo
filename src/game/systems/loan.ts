// Phase 3: 変動金利ローンシステムの純粋計算関数層
// reducer.ts を肥大化させないため、ローンロジックはここに集約する。
// macroEconomy と連携して景気ステータスに応じた変動金利を適用する。
// 既存ゲーム挙動を破壊しないよう、本ファイルの関数はすべて副作用なしの計算関数として実装する。

import type { EconomyStatus, GameState } from '../types';

// 景気ステータスごとの金利（GOマス通過時に元本へ乗じる）
export const LOAN_INTEREST_RATES: Record<EconomyStatus, number> = {
  boom: 0.05,
  normal: 0.1,
  recession: 0.15,
  crisis: 0.25,
};

// macroEconomy が無効のときに使用する固定金利
export const DEFAULT_LOAN_INTEREST_RATE = 0.1;

// 総資産に対する借入限度額の比率（50%まで借りられる）
export const MAX_LOAN_TO_ASSET_RATIO = 0.5;

/**
 * ローン機能が有効かどうかを判定する。
 */
export function isLoanEnabled(state: GameState): boolean {
  return state.features?.loan === true;
}

/**
 * 元本と金利から利息額を計算する（切り捨て）。
 *
 * @param principal 元本残高。
 * @param rate 金利（0〜1 の小数）。
 * @returns 利息額（floor）。
 */
export function calculateInterest(principal: number, rate: number): number {
  if (principal <= 0 || rate <= 0) return 0;
  return Math.floor(principal * rate);
}

/**
 * 総資産と既存ローン残高から、追加借入可能な上限額を計算する。
 *
 * 上限 = floor(totalAssets * MAX_LOAN_TO_ASSET_RATIO) - currentLoanBalance。
 * 結果が 0 未満の場合は 0 にクランプする。
 *
 * @param totalAssets プレイヤーの総資産（現金＋物件価値）。
 * @param currentLoanBalance 現在のローン残高（デフォルト 0）。
 * @returns 追加で借り入れ可能な上限額。
 */
export function calculateMaxLoanAmount(
  totalAssets: number,
  currentLoanBalance = 0,
): number {
  if (totalAssets <= 0) return 0;
  const cap = Math.floor(totalAssets * MAX_LOAN_TO_ASSET_RATIO);
  return Math.max(0, cap - currentLoanBalance);
}

/**
 * 現在の景気ステータスに応じた金利を返す。
 * macroEconomy が無効または economyStatus が未設定の場合は DEFAULT_LOAN_INTEREST_RATE を返す。
 */
export function getLoanInterestRate(state: GameState): number {
  if (state.features?.macroEconomy && state.economyStatus) {
    return LOAN_INTEREST_RATES[state.economyStatus];
  }
  return DEFAULT_LOAN_INTEREST_RATE;
}

// ── バリデーション型 ──

export type LoanTakeReason =
  | 'LOAN_DISABLED'
  | 'INVALID_AMOUNT'
  | 'EXCEEDS_LIMIT'
  | 'PLAYER_NOT_FOUND';

export type LoanTakeValidation =
  | { ok: true }
  | { ok: false; reason: LoanTakeReason };

export type LoanRepayReason =
  | 'LOAN_DISABLED'
  | 'INVALID_AMOUNT'
  | 'NO_LOAN'
  | 'INSUFFICIENT_FUNDS'
  | 'OVERPAYMENT'
  | 'PLAYER_NOT_FOUND';

export type LoanRepayValidation =
  | { ok: true }
  | { ok: false; reason: LoanRepayReason };

/**
 * 借入バリデーション。
 * totalAssets は呼び出し側で calculateTotalAssets を使って計算して渡す。
 */
export function validateTakeLoan(
  state: GameState,
  playerId: string,
  amount: number,
): LoanTakeValidation {
  if (!isLoanEnabled(state)) return { ok: false, reason: 'LOAN_DISABLED' };
  if (!Number.isInteger(amount) || amount <= 0)
    return { ok: false, reason: 'INVALID_AMOUNT' };
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, reason: 'PLAYER_NOT_FOUND' };

  // 総資産を簡易計算（money + 物件抵当価値の合計）
  const totalAssets = _calcAssets(state, player);
  const maxAdditional = calculateMaxLoanAmount(
    totalAssets,
    player.loanBalance ?? 0,
  );
  if (amount > maxAdditional) return { ok: false, reason: 'EXCEEDS_LIMIT' };
  return { ok: true };
}

/**
 * 返済バリデーション。
 */
export function validateRepayLoan(
  state: GameState,
  playerId: string,
  amount: number,
): LoanRepayValidation {
  if (!isLoanEnabled(state)) return { ok: false, reason: 'LOAN_DISABLED' };
  if (!Number.isInteger(amount) || amount <= 0)
    return { ok: false, reason: 'INVALID_AMOUNT' };
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, reason: 'PLAYER_NOT_FOUND' };
  if ((player.loanBalance ?? 0) <= 0) return { ok: false, reason: 'NO_LOAN' };
  if (amount > (player.loanBalance ?? 0))
    return { ok: false, reason: 'OVERPAYMENT' };
  if (player.money < amount) return { ok: false, reason: 'INSUFFICIENT_FUNDS' };
  return { ok: true };
}

// 内部ヘルパー: Player の簡易総資産計算（rules.ts の循環依存を避けるためシンプル実装）
// reducer.ts 側では calculateTotalAssets を使う
function _calcAssets(
  state: GameState,
  player: (typeof state.players)[0],
): number {
  let total = player.money;
  for (const propId of player.properties) {
    const propState = state.propertyStates[propId];
    const space = state.board.find((s) => s.id === propId);
    if (space && !propState?.isMortgaged) total += space.mortgageValue ?? 0;
    if (propState && propState.houses > 0)
      total += Math.floor(((space?.houseCost ?? 0) * propState.houses) / 2);
  }
  return total;
}

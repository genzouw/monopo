// 変動金利ローンシステムの純粋計算関数層
// 固定金利 vs 変動金利（景気連動）の選択と、信用スコアによる金利調整を実装する。
// 既存ゲーム挙動を破壊しないよう、本ファイルの関数はすべて副作用なしの計算関数として実装する。

import type { EconomyStatus, GameState, Player } from '../types';
import { calculateTotalAssets } from '../rules';
import {
  CREDIT_SCORE_INITIAL,
  calculateCreditScoreDiscount,
  isCreditScoreEnabled,
} from './credit';

export type LoanType = 'fixed' | 'variable';

// 変動金利: 景気ステータスごとの金利（GOマス通過時に元本へ乗じる）
export const LOAN_INTEREST_RATES: Record<EconomyStatus, number> = {
  boom: 0.05,
  normal: 0.1,
  recession: 0.15,
  crisis: 0.25,
};

// 固定金利（景気状態に依存しない、変動金利の通常時より高め）
export const FIXED_LOAN_RATE = 0.12;

// macroEconomy が無効のときに使用するデフォルト変動金利
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
 * プレイヤーの信用スコアと景気状態を考慮した実効金利を返す。
 *
 * - 固定金利（'fixed'）: FIXED_LOAN_RATE を返す（景気・信用スコア不問）
 * - 変動金利（'variable'）:
 *   - macroEconomy が有効かつ economyStatus がある場合: LOAN_INTEREST_RATES[status] を基準に
 *   - それ以外: DEFAULT_LOAN_INTEREST_RATE を基準に
 *   - creditScore 機能が有効な場合: calculateCreditScoreDiscount で調整
 *   - 最低 0 にクランプ（負金利なし）
 *
 * @param state 現在のゲーム状態。
 * @param player 借入プレイヤー。
 * @param loanType 'fixed' or 'variable'。
 * @returns 実効金利（0以上）。
 */
export function getLoanInterestRate(
  state: GameState,
  player: Player,
  loanType: LoanType,
): number {
  if (loanType === 'fixed') return FIXED_LOAN_RATE;

  const baseRate =
    state.features?.macroEconomy && state.economyStatus
      ? LOAN_INTEREST_RATES[state.economyStatus]
      : DEFAULT_LOAN_INTEREST_RATE;

  if (!isCreditScoreEnabled(state)) return baseRate;

  const discount = calculateCreditScoreDiscount(
    player.creditScore ?? CREDIT_SCORE_INITIAL,
  );
  // 浮動小数点誤差を避けるため小数点4桁で丸める
  return Math.max(0, Math.round((baseRate + discount) * 10000) / 10000);
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
  | 'PLAYER_NOT_FOUND';

export type LoanRepayValidation =
  | { ok: true }
  | { ok: false; reason: LoanRepayReason };

/**
 * 借入バリデーション。
 * totalAssets は呼び出し側で計算せず内部で算出する（循環依存回避のシンプル実装）。
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
  if (player.money < amount) return { ok: false, reason: 'INSUFFICIENT_FUNDS' };
  return { ok: true };
}

function _calcAssets(
  state: GameState,
  player: (typeof state.players)[0],
): number {
  return calculateTotalAssets(player, state.propertyStates, state.board);
}

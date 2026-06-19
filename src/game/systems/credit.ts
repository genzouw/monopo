// 信用スコア（クレジットスコア）の純粋計算関数層
// プレイヤーの信用度を数値化し、ローン金利優遇・物件購入制限に連動させる。
// 既存ゲーム挙動を破壊しないよう、本ファイルの関数はすべて副作用なしの計算関数として実装する。

import type { GameState } from '../types';

export const CREDIT_SCORE_INITIAL = 500;
export const CREDIT_SCORE_MIN = 0;
export const CREDIT_SCORE_MAX = 850;

// 支払い完了（家賃・罰金）でスコア加算
export const CREDIT_SCORE_PAY_BONUS = 10;

// 破産でスコア減算
export const CREDIT_SCORE_BANKRUPTCY_PENALTY = 200;

// この閾値未満のスコアは高額物件購入が制限される
export const CREDIT_SCORE_PURCHASE_BLOCK_THRESHOLD = 300;

// この価格を超える物件が「高額物件」とみなされる
export const CREDIT_SCORE_EXPENSIVE_THRESHOLD = 400;

/**
 * creditScore 機能が有効かどうかを判定する。
 */
export function isCreditScoreEnabled(state: GameState): boolean {
  return state.features?.creditScore === true;
}

/**
 * 信用スコアに応じたローン金利割引率を返す。
 *
 * - 700+: -0.05（5%割引）
 * - 600-699: -0.025（2.5%割引）
 * - 500-599: 0（割引なし）
 * - 400-499: +0.025（2.5%加算）
 * - 400未満: +0.05（5%加算）
 *
 * @param score プレイヤーの信用スコア（0-850）。
 * @returns 金利調整値（負数なら割引、正数なら割増）。
 */
export function calculateCreditScoreDiscount(score: number): number {
  if (score >= 700) return -0.05;
  if (score >= 600) return -0.025;
  if (score >= 500) return 0;
  if (score >= 400) return 0.025;
  return 0.05;
}

/**
 * 支払い完了時の新しい信用スコアを返す。
 * CREDIT_SCORE_PAY_BONUS を加算し、CREDIT_SCORE_MAX でクランプする。
 *
 * @param currentScore 現在の信用スコア。
 * @returns 更新後の信用スコア。
 */
export function calculateCreditScoreOnPayment(currentScore: number): number {
  return Math.min(currentScore + CREDIT_SCORE_PAY_BONUS, CREDIT_SCORE_MAX);
}

/**
 * 破産時の新しい信用スコアを返す。
 * CREDIT_SCORE_BANKRUPTCY_PENALTY を減算し、CREDIT_SCORE_MIN でクランプする。
 *
 * @param currentScore 現在の信用スコア。
 * @returns 更新後の信用スコア。
 */
export function calculateCreditScoreOnBankruptcy(currentScore: number): number {
  return Math.max(
    currentScore - CREDIT_SCORE_BANKRUPTCY_PENALTY,
    CREDIT_SCORE_MIN,
  );
}

/**
 * 物件購入がスコアにより制限されるかどうかを返す。
 *
 * スコアが CREDIT_SCORE_PURCHASE_BLOCK_THRESHOLD 未満 かつ
 * 物件価格が CREDIT_SCORE_EXPENSIVE_THRESHOLD より高い場合に `true`。
 *
 * @param score プレイヤーの信用スコア。
 * @param propertyPrice 購入しようとしている物件の価格。
 * @returns 購入が制限される場合 `true`。
 */
export function isCreditScorePurchaseBlocked(
  score: number,
  propertyPrice: number,
): boolean {
  return (
    score < CREDIT_SCORE_PURCHASE_BLOCK_THRESHOLD &&
    propertyPrice > CREDIT_SCORE_EXPENSIVE_THRESHOLD
  );
}

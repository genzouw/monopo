// Phase 3: 損害保険システムの純粋計算関数層
// ブラックスワンリスク（火災・地震）に備える掛け捨て保険を実装する。
// 保険有効期間は1ラウンド（購入後次のブラックスワンイベントで一度だけ発動）。

import type { ColorGroup, GameState } from '../types';

// 物件価格に対する保険料の比率（5%）
export const INSURANCE_PREMIUM_RATE = 0.05;

/**
 * 物件価格から保険料を計算する（切り捨て）。
 * @param propertyPrice 物件の購入価格。
 */
export function calculateInsurancePremium(propertyPrice: number): number {
  if (propertyPrice <= 0) return 0;
  return Math.floor(propertyPrice * INSURANCE_PREMIUM_RATE);
}

/**
 * insurance 機能が有効かどうかを判定する。
 */
export function isInsuranceEnabled(state: GameState): boolean {
  return state.features?.insurance === true;
}

// ── バリデーション型 ──

export type InsuranceBuyReason =
  | 'INSURANCE_DISABLED'
  | 'NOT_OWNER'
  | 'ALREADY_INSURED'
  | 'INSUFFICIENT_FUNDS'
  | 'PLAYER_NOT_FOUND'
  | 'PROPERTY_NOT_FOUND';

export type InsuranceBuyValidation =
  | { ok: true; premium: number }
  | { ok: false; reason: InsuranceBuyReason };

/**
 * 保険購入バリデーション。
 * @param state 現在のゲーム状態。
 * @param playerId 購入するプレイヤーのID。
 * @param propertyId 保険をかける物件のID。
 */
export function validateBuyInsurance(
  state: GameState,
  playerId: string,
  propertyId: string,
): InsuranceBuyValidation {
  if (!isInsuranceEnabled(state))
    return { ok: false, reason: 'INSURANCE_DISABLED' };
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, reason: 'PLAYER_NOT_FOUND' };
  if (!player.properties.includes(propertyId))
    return { ok: false, reason: 'NOT_OWNER' };
  const space = state.board.find((s) => s.id === propertyId);
  if (!space) return { ok: false, reason: 'PROPERTY_NOT_FOUND' };
  if (state.propertyStates[propertyId]?.isInsured)
    return { ok: false, reason: 'ALREADY_INSURED' };
  const premium = calculateInsurancePremium(space.price ?? 0);
  if (player.money < premium)
    return { ok: false, reason: 'INSUFFICIENT_FUNDS' };
  return { ok: true, premium };
}

/**
 * ブラックスワン発生時、指定カラーグループの物件に被害を適用する。
 *
 * - 保険あり（isInsured=true）: 被害なし、保険フラグをリセット（掛け捨て）
 * - 保険なし: 家が1つ失われる（homes=0の物件は影響なし）
 *
 * @param propertyStates 現在の物件状態。
 * @param affectedColorGroup 被害を受けるカラーグループ。
 * @param board ボードデータ（カラーグループの特定に使用）。
 * @returns 更新後の物件状態。
 */
export function applyBlackSwanDisaster(
  propertyStates: GameState['propertyStates'],
  affectedColorGroup: ColorGroup,
  board: GameState['board'],
): GameState['propertyStates'] {
  const newStates = { ...propertyStates };
  for (const space of board) {
    if (space.color !== affectedColorGroup) continue;
    const ps = newStates[space.id];
    if (!ps || ps.ownerId === null) continue;
    if (ps.isInsured) {
      // 保険発動: 被害なし・保険フラグをリセット
      newStates[space.id] = { ...ps, isInsured: false };
    } else if (ps.houses > 0) {
      // 無保険: 家を1つ失う
      newStates[space.id] = { ...ps, houses: ps.houses - 1 };
    }
  }
  return newStates;
}

// P2-c 拡張: 保険システムの純粋関数層
// economy.ts と同じパターンで副作用なし計算関数を集約する。
// featureFlag insurance=false 時は reducer 側で全スキップし既存挙動を保証。

import type { GameState } from './types';

export const INSURANCE_RATE = 0.03; // 保険料: 評価額の3% / 10ターン
export const FIRE_PROBABILITY = 0.02; // 火災発生確率: 毎ターン2%
export const FIRE_SCRAP_RATE = 0.2; // 保険なし時のスクラップ残存率: 20%
export const INSURANCE_COLLECT_INTERVAL = 10; // 保険料徴収間隔（ターン数）

export function isInsuranceEnabled(state: GameState): boolean {
  return state.features?.insurance === true;
}

/** 指定物件の保険料（評価額 × INSURANCE_RATE、切り捨て） */
export function calculatePremium(propertyValue: number): number {
  return Math.floor(propertyValue * INSURANCE_RATE);
}

/** 指定ターン数が保険料徴収タイミングか（INSURANCE_COLLECT_INTERVAL の倍数） */
export function shouldCollectPremium(turnCount: number): boolean {
  return turnCount > 0 && turnCount % INSURANCE_COLLECT_INTERVAL === 0;
}

/** 火災発生時の補填額（保険あり: 評価額100%、なし: スクラップ率分のみ） */
export function calculateFirePayout(
  propertyValue: number,
  insured: boolean,
): number {
  if (insured) return propertyValue;
  return Math.floor(propertyValue * FIRE_SCRAP_RATE);
}

/** propertyId の保険加入状態を返す */
export function isPropertyInsured(
  insuranceState: Record<string, boolean> | undefined,
  propertyId: string,
): boolean {
  return insuranceState?.[propertyId] === true;
}

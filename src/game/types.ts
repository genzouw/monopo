// ゲーム状態・セットアップ設定の型は schema.ts のスキーマから導出している。
// フィールドを足すときは schema.ts を変えること（保存データの検証も同時に揃う）。
import type { Player } from './schema';

export {
  TOKENS,
  MIN_PLAYERS,
  MAX_PLAYERS,
  MAX_NAME_LENGTH,
  RAW_LENGTH_LIMIT_MULTIPLIER,
} from './schema';
export type {
  ColorGroup,
  BoardSpace,
  Player,
  EconomyStatus,
  FeatureFlags,
  ColorGroupStock,
  CardAction,
  Card,
  PropertyState,
  AuctionState,
  TradeOffer,
  CryptoHolding,
  VCInvestment,
  ESGHolding,
  TurnPhase,
  GameState,
  SetupConfig,
} from './schema';

// ── 取引検証結果 ──
export type TradeInvalidReason =
  | 'PLAYER_NOT_FOUND'
  | 'PLAYER_BANKRUPT'
  | 'NOT_INTEGER'
  | 'NEGATIVE_VALUE'
  | 'INSUFFICIENT_FUNDS'
  | 'INSUFFICIENT_JAIL_CARDS'
  | 'NOT_PROPERTY_OWNER'
  | 'PROPERTY_HAS_HOUSES';

export type TradeValidationResult =
  { isValid: true } | { isValid: false; reason: TradeInvalidReason };

// ── P3-a 拡張: ローン状態 ──
/**
 * 現在はどこからも参照されない。金融危機の連鎖（CDO・不良債権）の拡張（Issue #818）で使う想定の型として
 * 残している。Knip の未使用 export 検出から除外する。
 * @public
 */
export type LoanState = {
  principal: number; // 残元本
  annualRate: number; // 現在の年利（小数）
  monthlyPayment: number; // 毎ターン返済額（元利均等）
  remainingPayments: number; // 残返済回数
};

// ── ファクトリ関数 ──
export function createInitialPlayer(
  id: string,
  name: string,
  token: string,
): Player {
  return {
    id,
    name,
    token,
    money: 1500,
    position: 0,
    properties: [],
    inJail: false,
    jailTurns: 0,
    getOutOfJailCards: 0,
    isBankrupt: false,
  };
}

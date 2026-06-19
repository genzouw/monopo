import type { ColorGroup, FeatureFlags, TradeOffer, GameState } from './types';

export type GameAction =
  | {
      type: 'START_GAME';
      playerNames: string[];
      playerTokens: string[];
      features?: FeatureFlags;
    }
  | { type: 'RESUME_GAME'; savedState: GameState }
  | { type: 'ROLL_DICE' }
  | { type: 'FINISH_MOVING' }
  | { type: 'BUY_PROPERTY' }
  | { type: 'DECLINE_PURCHASE' }
  | { type: 'PLACE_BID'; amount: number }
  | { type: 'PASS_AUCTION' }
  | { type: 'DRAW_CARD' }
  | { type: 'DISMISS_CARD' }
  | { type: 'BUILD_HOUSE'; propertyId: string }
  | { type: 'SELL_HOUSE'; propertyId: string }
  | { type: 'OPEN_BUILD_DIALOG' }
  | { type: 'CLOSE_BUILD_DIALOG' }
  | { type: 'SELL_PROPERTY'; propertyId: string }
  | { type: 'OPEN_SELL_DIALOG' }
  | { type: 'CLOSE_SELL_DIALOG' }
  | { type: 'OPEN_TRADE_DIALOG'; targetPlayerId: string }
  | { type: 'CLOSE_TRADE_DIALOG' }
  | { type: 'PROPOSE_TRADE'; offer: TradeOffer }
  | { type: 'ACCEPT_TRADE' }
  | { type: 'REJECT_TRADE' }
  | { type: 'PAY_JAIL_FINE' }
  | { type: 'USE_JAIL_CARD' }
  | { type: 'ROLL_FOR_JAIL' }
  | { type: 'FORCE_BUY' }
  | { type: 'DECLINE_FORCE_BUY' }
  | { type: 'ACTIVATE_POISON_PILL'; propertyId: string }
  | { type: 'DECLARE_BANKRUPTCY'; creditorId: string | null }
  | { type: 'END_TURN' }
  | { type: 'PAY_TAX' }
  // P1 拡張: 株式売買（需要供給モデル）
  | { type: 'OPEN_STOCK_DIALOG' }
  | { type: 'CLOSE_STOCK_DIALOG' }
  | { type: 'BUY_STOCK'; color: ColorGroup; shares: number }
  | { type: 'SELL_STOCK'; color: ColorGroup; shares: number }
  // P3 拡張: 新アセットクラス（暗号資産・VC・ESG）
  | { type: 'OPEN_ALT_ASSET_DIALOG' }
  | { type: 'CLOSE_ALT_ASSET_DIALOG' }
  | { type: 'BUY_CRYPTO'; amount: number }
  | { type: 'SELL_CRYPTO' }
  | { type: 'INVEST_VC'; amount: number }
  | { type: 'BUY_ESG'; amount: number }
  | { type: 'SELL_ESG'; index: number }
  // ローン拡張: 変動/固定金利ローン
  | {
      type: 'TAKE_LOAN';
      playerId: string;
      amount: number;
      loanType: 'fixed' | 'variable';
    }
  | { type: 'REPAY_LOAN'; playerId: string; amount: number }
  // 累進課税拡張: 節税アクション（GOマス通過時に寄付で課税所得を控除）
  | { type: 'DONATE'; playerId: string; amount: number }
  // P2-c 拡張: 不動産保険（火災リスク・保険料・補填）
  | { type: 'BUY_INSURANCE'; propertyId: string }
  | { type: 'CANCEL_INSURANCE'; propertyId: string };

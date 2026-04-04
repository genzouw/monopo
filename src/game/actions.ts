import type { TradeOffer } from './types';

export type GameAction =
  | { type: 'START_GAME'; playerNames: string[]; playerTokens: string[] }
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
  | { type: 'MORTGAGE_PROPERTY'; propertyId: string }
  | { type: 'UNMORTGAGE_PROPERTY'; propertyId: string }
  | { type: 'OPEN_MORTGAGE_DIALOG' }
  | { type: 'CLOSE_MORTGAGE_DIALOG' }
  | { type: 'OPEN_TRADE_DIALOG'; targetPlayerId: string }
  | { type: 'CLOSE_TRADE_DIALOG' }
  | { type: 'PROPOSE_TRADE'; offer: TradeOffer }
  | { type: 'ACCEPT_TRADE' }
  | { type: 'REJECT_TRADE' }
  | { type: 'PAY_JAIL_FINE' }
  | { type: 'USE_JAIL_CARD' }
  | { type: 'ROLL_FOR_JAIL' }
  | { type: 'DECLARE_BANKRUPTCY'; creditorId: string | null }
  | { type: 'END_TURN' }
  | { type: 'PAY_TAX' };

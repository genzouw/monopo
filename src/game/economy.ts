// P1 拡張: 経済モデルの純粋関数層
// reducer.ts を肥大化させないため、株式・配当・増資のロジックはここに集約する。
// 既存ゲーム挙動を破壊しないよう、本ファイルの関数はすべて副作用なしの計算関数として実装する。

import type {
  ColorGroup,
  ColorGroupStock,
  GameState,
  Player,
  PropertyState,
} from './types';
import { getSpaceById } from './rules';

// TODO: balance review — マジックナンバーは将来のバランス調整で見直す
export const STOCK_INITIAL_PRICE = 100;
export const STOCK_TOTAL_SHARES = 100;
export const DIVIDEND_RATE_PCT = 10; // 家賃の 10% を株主に配当
export const INVESTMENT_COST = 200;
export const INVESTMENT_STOCK_BOOST = 10; // 1回の増資で株価が +10

// 既存のすべての ColorGroup を列挙（types.ts と一致）
export const STOCK_COLOR_GROUPS: ColorGroup[] = [
  'brown',
  'lightblue',
  'pink',
  'orange',
  'red',
  'yellow',
  'green',
  'blue',
  'railroad',
];

export function isStocksEnabled(state: GameState): boolean {
  return state.features?.stocks === true;
}

export function isInvestmentEnabled(state: GameState): boolean {
  return state.features?.investment === true;
}

// 株式市場の初期状態を作成
export function createInitialStockMarket(): Record<
  ColorGroup,
  ColorGroupStock
> {
  const market = {} as Record<ColorGroup, ColorGroupStock>;
  for (const color of STOCK_COLOR_GROUPS) {
    market[color] = {
      color,
      pricePerShare: STOCK_INITIAL_PRICE,
      totalShares: STOCK_TOTAL_SHARES,
      bankShares: STOCK_TOTAL_SHARES,
    };
  }
  return market;
}

// 指定プレイヤーの指定カラーグループにおける株の保有比率（0-1）を返す
export function getStockHoldingRatio(
  color: ColorGroup,
  player: Player,
): number {
  const shares = player.stocks?.[color] ?? 0;
  if (shares <= 0) return 0;
  return shares / STOCK_TOTAL_SHARES;
}

// 家賃支払時の配当総額（家賃の DIVIDEND_RATE_PCT%）
export function calculateDividendPool(rentAmount: number): number {
  if (rentAmount <= 0) return 0;
  return Math.floor((rentAmount * DIVIDEND_RATE_PCT) / 100);
}

// 配当配分: 各プレイヤーへの配当額（家賃を受け取った owner と payer は除外）
// rentRecipientId に配当を渡さないことで「自分の物件からの配当を自分が貰う」二重取りを防止する。
// payerId（家賃を支払った人）にも配当を渡さないようにし、支払いと配当が相殺する不自然さを排除する。
export function distributeDividends(
  rentAmount: number,
  color: ColorGroup | undefined,
  rentRecipientId: string | null,
  payerId: string,
  players: Player[],
): Record<string, number> {
  const result: Record<string, number> = {};
  if (!color) return result;
  const pool = calculateDividendPool(rentAmount);
  if (pool <= 0) return result;

  // 配当対象プレイヤーの抽出
  const eligible = players.filter(
    (p) => !p.isBankrupt && p.id !== rentRecipientId && p.id !== payerId,
  );
  // 持株数の合計（対象プレイヤー内の合計のみで按分する。
  // 銀行株や除外されたプレイヤー保有分は配分対象外。これにより
  // 配当総額が予算 pool を超えない。）
  let totalEligibleShares = 0;
  for (const p of eligible) {
    totalEligibleShares += p.stocks?.[color] ?? 0;
  }
  if (totalEligibleShares <= 0) return result;

  for (const p of eligible) {
    const shares = p.stocks?.[color] ?? 0;
    if (shares <= 0) continue;
    const amount = Math.floor((pool * shares) / totalEligibleShares);
    if (amount > 0) result[p.id] = amount;
  }
  return result;
}

// 株購入の検証＆コスト計算
export type StockBuyValidation =
  | { ok: true; cost: number }
  | { ok: false; reason: StockBuyReason };

export type StockBuyReason =
  | 'STOCKS_DISABLED'
  | 'COLOR_UNKNOWN'
  | 'PLAYER_NOT_FOUND'
  | 'INVALID_SHARES'
  | 'INSUFFICIENT_BANK_SHARES'
  | 'INSUFFICIENT_FUNDS';

export function validateStockBuy(
  state: GameState,
  playerId: string,
  color: ColorGroup,
  shares: number,
): StockBuyValidation {
  if (!isStocksEnabled(state)) return { ok: false, reason: 'STOCKS_DISABLED' };
  if (!Number.isInteger(shares) || shares <= 0)
    return { ok: false, reason: 'INVALID_SHARES' };
  const market = state.stockMarket?.[color];
  if (!market) return { ok: false, reason: 'COLOR_UNKNOWN' };
  if (market.bankShares < shares)
    return { ok: false, reason: 'INSUFFICIENT_BANK_SHARES' };
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, reason: 'PLAYER_NOT_FOUND' };
  const cost = market.pricePerShare * shares;
  if (player.money < cost) return { ok: false, reason: 'INSUFFICIENT_FUNDS' };
  return { ok: true, cost };
}

// 株売却の検証＆獲得額計算
export type StockSellValidation =
  | { ok: true; proceeds: number }
  | { ok: false; reason: StockSellReason };

export type StockSellReason =
  | 'STOCKS_DISABLED'
  | 'COLOR_UNKNOWN'
  | 'PLAYER_NOT_FOUND'
  | 'INVALID_SHARES'
  | 'INSUFFICIENT_HOLDINGS';

export function validateStockSell(
  state: GameState,
  playerId: string,
  color: ColorGroup,
  shares: number,
): StockSellValidation {
  if (!isStocksEnabled(state)) return { ok: false, reason: 'STOCKS_DISABLED' };
  if (!Number.isInteger(shares) || shares <= 0)
    return { ok: false, reason: 'INVALID_SHARES' };
  const market = state.stockMarket?.[color];
  if (!market) return { ok: false, reason: 'COLOR_UNKNOWN' };
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, reason: 'PLAYER_NOT_FOUND' };
  const owned = player.stocks?.[color] ?? 0;
  if (owned < shares) return { ok: false, reason: 'INSUFFICIENT_HOLDINGS' };
  const proceeds = market.pricePerShare * shares;
  return { ok: true, proceeds };
}

// 増資の検証
export type InvestmentValidation =
  | { ok: true; cost: number; color: ColorGroup }
  | { ok: false; reason: InvestmentReason };

export type InvestmentReason =
  | 'INVESTMENT_DISABLED'
  | 'NOT_OWNER'
  | 'PROPERTY_NOT_FOUND'
  | 'NOT_COLORED_PROPERTY'
  | 'INSUFFICIENT_FUNDS';

export function validateInvestment(
  state: GameState,
  playerId: string,
  propertyId: string,
): InvestmentValidation {
  if (!isInvestmentEnabled(state))
    return { ok: false, reason: 'INVESTMENT_DISABLED' };
  const space = getSpaceById(propertyId, state.board);
  if (!space) return { ok: false, reason: 'PROPERTY_NOT_FOUND' };
  if (!space.color) return { ok: false, reason: 'NOT_COLORED_PROPERTY' };
  const ps: PropertyState | undefined = state.propertyStates[propertyId];
  if (!ps || ps.ownerId !== playerId) return { ok: false, reason: 'NOT_OWNER' };
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, reason: 'NOT_OWNER' };
  if (player.money < INVESTMENT_COST)
    return { ok: false, reason: 'INSUFFICIENT_FUNDS' };
  return { ok: true, cost: INVESTMENT_COST, color: space.color };
}

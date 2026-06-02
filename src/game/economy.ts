// P1 拡張: 経済モデルの純粋関数層
// reducer.ts を肥大化させないため、株式・配当のロジックはここに集約する。
// 既存ゲーム挙動を破壊しないよう、本ファイルの関数はすべて副作用なしの計算関数として実装する。

import type { ColorGroup, ColorGroupStock, GameState, Player } from './types';

// TODO: balance review — マジックナンバーは将来のバランス調整で見直す
export const STOCK_INITIAL_PRICE = 100;
export const STOCK_TOTAL_SHARES = 100;
export const DIVIDEND_RATE_PCT = 10; // 家賃の 10% を株主に配当

// 株価は需要供給モデル: 1株売買ごとに価格を ±PRICE_DELTA_PER_SHARE 変動させる
// （買い = 市場から株が減る = 価格上昇、売り = 市場へ株が戻る = 価格下降）。
// 株価の下限を STOCK_MIN_PRICE で保証することで、暴落時の負値・無料化を回避。
export const PRICE_DELTA_PER_SHARE = 5;
export const STOCK_MIN_PRICE = 10;

// 家・ホテル建設による株価ブースト: 物件価値向上 = そのエリアの株価上昇
// （売却時は下降）。子供向けメタファー: 「家をたてたら、おうえんカードが人気に！」
export const HOUSE_PRICE_BOOST = 15;

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

// 株価変動: 現在価格に金額デルタを加算し、下限 STOCK_MIN_PRICE でクランプする純粋関数。
// 売買ブーストには `sharesDelta * PRICE_DELTA_PER_SHARE` を、
// 家・ホテル建設ブーストには `±HOUSE_PRICE_BOOST` を呼び出し側で事前計算して渡す。
export function calculateNextPrice(
  currentPrice: number,
  priceDelta: number,
): number {
  return Math.max(currentPrice + priceDelta, STOCK_MIN_PRICE);
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
  if (!player) return { ok: false, reason: 'COLOR_UNKNOWN' };
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
  if (!player) return { ok: false, reason: 'COLOR_UNKNOWN' };
  const owned = player.stocks?.[color] ?? 0;
  if (owned < shares) return { ok: false, reason: 'INSUFFICIENT_HOLDINGS' };
  const proceeds = market.pricePerShare * shares;
  return { ok: true, proceeds };
}

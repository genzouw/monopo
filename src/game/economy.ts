// P1 拡張: 経済モデルの純粋関数層
// reducer.ts を肥大化させないため、株式・配当のロジックはここに集約する。
// 既存ゲーム挙動を破壊しないよう、本ファイルの関数はすべて副作用なしの計算関数として実装する。

import type {
  ColorGroup,
  ColorGroupStock,
  EconomyStatus,
  GameState,
  Player,
} from './types';
import {
  applyEconomyFactor,
  isMacroEconomyEnabled,
} from './systems/macroEconomy';

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

// 景気を加味した実効株価を返す純粋関数。
//
// `pricePerShare`（基準価格）は需給・建設のみで変動し景気の影響を受けない素の価格とし、
// 売買・清算・表示で実際に用いる価格はここで景気乗数を掛けて算出する。
// これにより不況・金融危機で下がった株価は、景気回復とともに乗数が戻り
// 自動的に元の水準へ戻る（片道の暴落処理に頼らない対称的な設計）。
// `status` 未指定（macroEconomy 無効）なら基準価格をそのまま返し、既存挙動と完全互換。
export function getEffectiveStockPrice(
  basePrice: number,
  status?: EconomyStatus,
): number {
  if (!status) return basePrice;
  return applyEconomyFactor(basePrice, status);
}

// ゲーム状態から株価評価に用いる景気ステータスを導出する。
// macroEconomy 無効時は `undefined`（景気補正なし）を返す。
export function getPricingEconomyStatus(
  state: GameState,
): EconomyStatus | undefined {
  return isMacroEconomyEnabled(state) ? state.economyStatus : undefined;
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
  const price = getEffectiveStockPrice(
    market.pricePerShare,
    getPricingEconomyStatus(state),
  );
  const cost = price * shares;
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
  const price = getEffectiveStockPrice(
    market.pricePerShare,
    getPricingEconomyStatus(state),
  );
  const proceeds = price * shares;
  return { ok: true, proceeds };
}

// Phase 1.2 / Phase 3-c 拡張: FORCE_BUY の可変乗数計算（3〜5倍）
// 物件の開発度（家・ホテルの数）に応じて買収コストが上昇する。
// 家なし=3倍、ホテル=5倍。ポイズンピル発動時は +FORCE_BUY_POISON_PILL_BONUS の追加ボーナス。
export const FORCE_BUY_MULTIPLIER_MIN = 3;
export const FORCE_BUY_MULTIPLIER_MAX = 5;
export const FORCE_BUY_POISON_PILL_BONUS = 1;

/**
 * FORCE_BUY（強制買収）の可変乗数を計算する。
 *
 * 開発度（家・ホテルの数）に応じて 3〜5 倍へ線形補間し、
 * `poisonPillActive` が true の場合は `FORCE_BUY_POISON_PILL_BONUS`（1）を加算する。
 *
 * @param houses 物件の開発度（0..5）。範囲外は 0/5 にクランプされる。
 * @param poisonPillActive ポイズンピル防衛が発動中か否か。
 */
export function calculateForceBuyMultiplier(
  houses: number,
  poisonPillActive?: boolean,
): number {
  const normalized = Math.max(0, Math.min(houses, 5));
  const base =
    FORCE_BUY_MULTIPLIER_MIN +
    ((FORCE_BUY_MULTIPLIER_MAX - FORCE_BUY_MULTIPLIER_MIN) * normalized) / 5;
  return base + (poisonPillActive ? FORCE_BUY_POISON_PILL_BONUS : 0);
}

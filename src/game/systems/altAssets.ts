// P3 拡張: 新アセットクラス（暗号資産・スタートアップVC・ESG投資）の純粋関数層
// economy.ts と同様に副作用なしで実装する。reducer.ts は本ファイルの関数を呼ぶだけの薄いラッパーに徹する。

import { mulberry32, hashString, boxMuller } from '../random';
import type { CryptoHolding, ESGHolding, VCInvestment } from '../types';

// ── 暗号資産（対数正規分布モデル） ──

export const CRYPTO_INITIAL_PRICE = 1000;
export const CRYPTO_DRIFT = 0.0;
export const CRYPTO_SIGMA = 0.3;
export const CRYPTO_MIN_RATIO = 0.1; // 初期価格の 10%
export const CRYPTO_MAX_RATIO = 10.0; // 初期価格の 1000%

// ターン番号とプレイヤー ID を組み合わせたシードで再現可能な次の価格を計算する
// new_price = current_price * exp(drift + σ * Z), Z ~ N(0,1)
export function calculateNextCryptoPrice(
  currentPrice: number,
  initialPrice: number,
  turn: number,
  playerId: string,
): number {
  const seed = ((turn * 1_000_003 + hashString(playerId)) >>> 0) | 0;
  const rng = mulberry32(seed);
  const u1 = rng();
  const u2 = rng();
  const z = boxMuller(u1, u2);
  const raw = currentPrice * Math.exp(CRYPTO_DRIFT + CRYPTO_SIGMA * z);
  const minPrice = Math.round(initialPrice * CRYPTO_MIN_RATIO);
  const maxPrice = Math.round(initialPrice * CRYPTO_MAX_RATIO);
  return Math.max(minPrice, Math.min(maxPrice, Math.round(raw)));
}

// 暗号資産購入: 投資額から保有ユニット数を計算して CryptoHolding を返す
export function buyCrypto(amount: number, currentPrice: number): CryptoHolding {
  const units = amount / currentPrice;
  return { units, initialPrice: currentPrice, currentPrice };
}

// 暗号資産売却: 保有ユニット × 現在価格を返す（整数に丸める）
export function sellCrypto(holding: CryptoHolding): number {
  return Math.floor(holding.units * holding.currentPrice);
}

// ── スタートアップ投資（VC） ──

export const VC_MATURITY_TURNS = 5; // 投資から5ターン後に判定

export type VCResolutionType = 'unicorn' | 'bankrupt' | 'partial';

export type VCResolution = {
  type: VCResolutionType;
  payout: number; // 返ってくる金額（0 = 全額消失）
};

// サイコロ2個の合計から VC 投資結果を判定する
// ≥10: ユニコーン（10倍）、≤2: 倒産（全額消失）、3-9: ±50%（7以上で+50%、6以下で-50%）
export function resolveVCInvestment(
  investedAmount: number,
  diceSum: number,
): VCResolution {
  if (diceSum >= 10) {
    return { type: 'unicorn', payout: investedAmount * 10 };
  }
  if (diceSum <= 2) {
    return { type: 'bankrupt', payout: 0 };
  }
  const payout =
    diceSum >= 7
      ? Math.round(investedAmount * 1.5)
      : Math.round(investedAmount * 0.5);
  return { type: 'partial', payout };
}

// VC が満期かどうかを判定
export function isVCMatured(
  investment: VCInvestment,
  currentTurn: number,
): boolean {
  return currentTurn - investment.investedTurn >= VC_MATURITY_TURNS;
}

// ── ESG投資 ──

export const ESG_DIVIDEND_RATE = 0.05; // 毎 ESG_DIVIDEND_INTERVAL ターンに 5%
export const ESG_DIVIDEND_INTERVAL = 10; // 10ターンごとに配当
// TODO (Phase 2-b): 保有 1 件につき課税所得から 500 控除
export const ESG_TAX_DEDUCTION_PER_HOLDING = 500;

// ESG 配当額を計算（端数切り捨て）
export function calculateESGDividend(holding: ESGHolding): number {
  return Math.floor(holding.amount * ESG_DIVIDEND_RATE);
}

// 指定ターンが ESG 配当発生ターンか判定
export function isESGDividendTurn(turnCount: number): boolean {
  return turnCount > 0 && turnCount % ESG_DIVIDEND_INTERVAL === 0;
}

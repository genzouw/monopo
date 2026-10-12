// 行動経済学バイアス（FOMO・バブル）の純粋計算関数層
// reducer.ts を肥大化させないため、バブルの判定・乗数合成・崩壊はここに集約する。
// 本モジュールはゲーム状態（GameState）に依存せず、自前の型だけで完結する。
// 乱数は使わない（閾値比較のみ）ため、Math.random / getSecureRandomInt は不要。
//
// 設計方針（Issue #670 のコメントで補正済み）:
// - 基準価格 `pricePerShare` は書き換えない。バブルは「実効価格にかかる乗数」として合成する。
// - バブル崩壊は状態を消すだけで、価格は景気乗数のみの水準へ自然に戻る。
//   そのため、金融危機（景気乗数 0.4）と同時に崩壊しても減少率が二重に適用されない。

import type { ColorGroup, EconomyStatus } from '../types';
import {
  applyEconomyFactor,
  ECONOMY_FACTORS,
  ECONOMY_FACTOR_MAX,
  ECONOMY_FACTOR_MIN,
} from './macroEconomy';

// TODO: balance review — マジックナンバーは将来のバランス調整で見直す
/** 純買い越しを数える直近ターン数（現在ターンを含む）。 */
export const BUBBLE_WINDOW_TURNS = 3;
/** バブルに入る、窓内の純買い越し株数の閾値（以上で入る）。 */
export const BUBBLE_NET_BUY_THRESHOLD = 10;
/** バブル中に実効価格へ掛ける乗数。 */
export const BUBBLE_MULTIPLIER = 1.4;
/** バブル開始からこのターン数が経つと崩壊する。 */
export const BUBBLE_DURATION_TURNS = 4;

/** 1 ターン分の純買い越し株数（買い = 正、売り = 負）。 */
export type BiasTurnNet = { turn: number; net: number };

/** 1 つのカラーグループのバイアス状態。 */
export type BiasMarketState = {
  /** 直近の窓内にあるターンごとの純買い越し。古い順。 */
  recent: BiasTurnNet[];
  /** バブルが始まったターン。バブル中でなければ null。 */
  bubbleStartedTurn: number | null;
};

/** カラーグループごとのバイアス状態。未登録の色は「平常」とみなす。 */
export type BehavioralBiasState = Partial<Record<ColorGroup, BiasMarketState>>;

/** 種明かしを出すべき出来事の種類。 */
export type BiasEventKind = 'bubbleStarted' | 'bubbleBurst';

/** バイアスの出来事と、プレイヤーへ見せる種明かしメッセージ。 */
export type BiasEvent = {
  kind: BiasEventKind;
  color: ColorGroup;
  message: string;
};

const COLOR_LABELS: Record<ColorGroup, string> = {
  brown: 'ちゃいろ',
  lightblue: 'みずいろ',
  pink: 'ピンク',
  orange: 'オレンジ',
  red: 'あか',
  yellow: 'きいろ',
  green: 'みどり',
  blue: 'あお',
  railroad: 'てつどう',
};

/**
 * 機能が作動する条件を判定する。株式が前提のため、stocks が OFF なら作動しない。
 *
 * @param features 機能フラグ（`behavioralBias` と `stocks`）。
 * @returns 両方が true のときだけ true。
 */
export function isBehavioralBiasActive(features?: {
  stocks?: boolean;
  behavioralBias?: boolean;
}): boolean {
  return features?.stocks === true && features?.behavioralBias === true;
}

/**
 * 空のバイアス状態を作る。
 *
 * @returns どの色もバブルでない状態。
 */
export function createInitialBiasState(): BehavioralBiasState {
  return {};
}

/**
 * 指定した色がバブル中かを返す。
 *
 * @param state バイアス状態。
 * @param color 判定するカラーグループ。
 * @returns バブル中なら true。
 */
export function isBubble(
  state: BehavioralBiasState,
  color: ColorGroup,
): boolean {
  return state[color]?.bubbleStartedTurn != null;
}

function windowNet(recent: BiasTurnNet[]): number {
  return recent.reduce((sum, t) => sum + t.net, 0);
}

function pruneWindow(recent: BiasTurnNet[], turn: number): BiasTurnNet[] {
  return recent.filter((t) => t.turn > turn - BUBBLE_WINDOW_TURNS);
}

/**
 * 株の売買を記録し、閾値を超えたらバブルに入れる。
 *
 * 純買い越しは直近 `BUBBLE_WINDOW_TURNS` ターンの合計で数える（売りは差し引く）。
 * すでにバブル中の色は、記録だけ行い再度の突入は起こさない。入力の状態は変更しない。
 *
 * @param state 現在のバイアス状態。
 * @param color 売買された株のカラーグループ。
 * @param sharesDelta 純買い株数（買い = 正、売り = 負）。0 は何もしない。
 * @param turn 現在のターン数。
 * @returns 更新後の状態と、バブルに入ったときだけ種明かしの出来事。
 */
export function recordStockTrade(
  state: BehavioralBiasState,
  color: ColorGroup,
  sharesDelta: number,
  turn: number,
): { state: BehavioralBiasState; event: BiasEvent | null } {
  if (!Number.isFinite(sharesDelta) || sharesDelta === 0) {
    return { state, event: null };
  }
  const prev: BiasMarketState = state[color] ?? {
    recent: [],
    bubbleStartedTurn: null,
  };
  const recent = pruneWindow(prev.recent, turn);
  const last = recent[recent.length - 1];
  if (last && last.turn === turn) {
    recent[recent.length - 1] = { turn, net: last.net + sharesDelta };
  } else {
    recent.push({ turn, net: sharesDelta });
  }

  let bubbleStartedTurn = prev.bubbleStartedTurn;
  let event: BiasEvent | null = null;
  if (
    bubbleStartedTurn == null &&
    windowNet(recent) >= BUBBLE_NET_BUY_THRESHOLD
  ) {
    bubbleStartedTurn = turn;
    event = {
      kind: 'bubbleStarted',
      color,
      message:
        `「${COLOR_LABELS[color]}」のかぶが、みんなに かわれて ねだんが ぐんぐん あがっているよ。` +
        'これは「バブル」。「かわないと そんする！」と あせる きもちが FOMO（フォーモ）だよ。' +
        'ねだんが ほんとうの かちより たかく なっていないか、おちついて かんがえてみよう。',
    };
  }
  return {
    state: { ...state, [color]: { recent, bubbleStartedTurn } },
    event,
  };
}

/**
 * ターンを進め、崩壊条件を満たしたバブルを終わらせる。
 *
 * 崩壊条件は「開始から `BUBBLE_DURATION_TURNS` ターン経過」または
 * 「景気が不況・金融危機」。崩壊した色は買い越しの履歴も消し、
 * すぐに再突入しないようにする。基準価格には触れない。
 *
 * @param state 現在のバイアス状態。
 * @param turn 現在のターン数。
 * @param economyStatus 現在の景気（macroEconomy が OFF なら undefined）。
 * @returns 更新後の状態と、崩壊した色ごとの種明かし。
 */
export function advanceBiasTurn(
  state: BehavioralBiasState,
  turn: number,
  economyStatus?: EconomyStatus,
): { state: BehavioralBiasState; events: BiasEvent[] } {
  const downturn = economyStatus === 'recession' || economyStatus === 'crisis';
  const next: BehavioralBiasState = {};
  const events: BiasEvent[] = [];
  for (const key of Object.keys(state) as ColorGroup[]) {
    const market = state[key];
    if (!market) continue;
    const started = market.bubbleStartedTurn;
    if (
      started != null &&
      (downturn || turn - started >= BUBBLE_DURATION_TURNS)
    ) {
      next[key] = { recent: [], bubbleStartedTurn: null };
      events.push({
        kind: 'bubbleBurst',
        color: key,
        message:
          `「${COLOR_LABELS[key]}」の バブルが はじけたよ！ ねだんが もとの たかさに もどったよ。` +
          'みんなが かうから かう、という あせりで たかい ねだんで かうと、そんを しやすいんだ。',
      });
      continue;
    }
    const recent = pruneWindow(market.recent, turn);
    if (recent.length === 0 && started == null) continue;
    next[key] = { recent, bubbleStartedTurn: started };
  }
  return { state: next, events };
}

/**
 * 基準価格から、景気とバブルを合成した実効株価を返す。
 *
 * バブル中は、景気乗数にバブル乗数を掛けた積を景気と同じクランプ範囲
 * （0.3〜2.0）に収める。バブルでなければ `applyEconomyFactor` と完全に同じ結果を返す
 * （macroEconomy OFF の `economyStatus` 未指定なら基準価格そのまま）。
 *
 * @param basePrice 基準価格（`pricePerShare`）。
 * @param bubble バブル中なら true。
 * @param economyStatus 景気（macroEconomy が OFF なら undefined）。
 * @returns 切り捨て済みの実効株価。
 */
export function composeBubblePrice(
  basePrice: number,
  bubble: boolean,
  economyStatus?: EconomyStatus,
): number {
  if (!bubble) {
    return economyStatus
      ? applyEconomyFactor(basePrice, economyStatus)
      : basePrice;
  }
  const economyFactor = economyStatus ? ECONOMY_FACTORS[economyStatus] : 1;
  const factor = Math.min(
    ECONOMY_FACTOR_MAX,
    Math.max(ECONOMY_FACTOR_MIN, economyFactor * BUBBLE_MULTIPLIER),
  );
  // 浮動小数の誤差（100 * 0.98 = 97.999...）で 1 下がらないよう、微小値を足してから切り捨てる
  return Math.floor(basePrice * factor + 1e-9);
}

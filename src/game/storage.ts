import * as v from 'valibot';
import type { GameState, SetupConfig } from './types';
import type {
  BehavioralBiasState,
  BiasMarketState,
  BiasTurnNet,
} from './systems/behavioralBias';
import { STOCK_COLOR_GROUPS } from './economy';
import { isBehavioralBiasActive } from './systems/behavioralBias';
import {
  GameStateSchema,
  SetupConfigSchema,
  MIN_PLAYERS,
  MAX_PLAYERS,
} from './schema';

/**
 * `JSON.parse` の reviver として使用し、`__proto__` / `constructor` キーを
 * 除去することでプロトタイプ汚染（Prototype Pollution）を防ぐ。
 * localStorage の内容は信頼できない入力として扱い、これらのキーを持つ
 * ペイロードが読み込まれても `Object.prototype` 等が汚染されないようにする。
 *
 * @param key - パース中のプロパティキー
 * @param value - パース中のプロパティ値
 * @returns 危険なキー（`__proto__` / `constructor`）の場合は `undefined`、それ以外はそのまま`value`
 */
function safeJsonReviver(key: string, value: unknown) {
  if (key === '__proto__' || key === 'constructor') {
    return undefined;
  }
  return value;
}

const STORAGE_KEY = 'monopo-save';
const SETUP_KEY = 'monopo-setup';
const LEGACY_STORAGE_KEY = 'monopoly-save';
const LEGACY_SETUP_KEY = 'monopoly-setup';
// 行動経済学拡張: 窓内に保持する履歴の上限（改ざんによる巨大配列の読み込みを防ぐ）
const MAX_BIAS_RECENT_ENTRIES = 16;

function isFiniteInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v);
}

/** 履歴 1 件（手番と買い越し数）を検証し、不正なら null を返す。 */
function sanitizeBiasTurn(entry: unknown): BiasTurnNet | null {
  if (entry === null || typeof entry !== 'object') return null;
  const e = entry as Record<string, unknown>;
  if (
    !isFiniteInt(e.turn) ||
    typeof e.net !== 'number' ||
    !Number.isFinite(e.net)
  ) {
    return null;
  }
  return { turn: e.turn, net: e.net };
}

/** 履歴の配列を検証し、不正（配列でない・上限超え・不正な要素）なら null を返す。 */
function sanitizeBiasRecent(raw: unknown): BiasMarketState['recent'] | null {
  if (!Array.isArray(raw) || raw.length > MAX_BIAS_RECENT_ENTRIES) return null;
  const recent: BiasMarketState['recent'] = [];
  for (const entry of raw) {
    const turn = sanitizeBiasTurn(entry);
    if (!turn) return null;
    recent.push(turn);
  }
  return recent;
}

function sanitizeBiasMarket(raw: unknown): BiasMarketState | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const m = raw as Record<string, unknown>;
  const recent = sanitizeBiasRecent(m.recent);
  if (!recent) return null;
  const started = m.bubbleStartedTurn;
  if (started !== null && !isFiniteInt(started)) return null;
  return { recent, bubbleStartedTurn: started };
}

/**
 * 保存データの behavioralBias を検証し、安全な形へ落とす。
 * 未知の色キー・不正な市場状態は取り除き、全体が object でなければ undefined を返す。
 */
function sanitizeBiasState(raw: unknown): BehavioralBiasState | undefined {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const out: BehavioralBiasState = {};
  const source = raw as Record<string, unknown>;
  for (const color of STOCK_COLOR_GROUPS) {
    if (!Object.prototype.hasOwnProperty.call(source, color)) continue;
    const market = sanitizeBiasMarket(source[color]);
    if (market) out[color] = market;
  }
  return out;
}

function readWithLegacyFallback(key: string, legacyKey: string): string | null {
  const current = localStorage.getItem(key);
  if (current !== null) return current;
  const legacy = localStorage.getItem(legacyKey);
  if (legacy === null) return null;
  try {
    localStorage.setItem(key, legacy);
    localStorage.removeItem(legacyKey);
  } catch {
    // migration write failed - return legacy value anyway
  }
  return legacy;
}

export function saveGame(state: GameState): void {
  if (state.phase !== 'playing') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable - silently fail
  }
}

/**
 * 値が `0 <= value < length` を満たす整数かどうかを判定する。
 *
 * @param value - 検証する値（信頼できない入力）
 * @param length - 添字の上限（この値は含まない）
 * @returns 配列の添字として範囲内の整数なら true
 */
function isIndexInRange(value: unknown, length: number): boolean {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < length
  );
}

/**
 * 保存データの手番（`currentPlayerIndex`）と各プレイヤーの位置（`position`）が、
 * プレイヤー配列・盤面配列の範囲内にあるかを検証する。
 * `players` の配列性と要素がオブジェクトであることは、呼び出し側で検証済みとする。
 *
 * @param state - JSON から復元した直後の状態（信頼できない入力）
 * @returns 手番と全プレイヤーの位置が範囲内なら true
 */
function hasValidIndices(state: GameState): boolean {
  if (!Array.isArray(state.board) || state.board.length === 0) return false;
  const boardSize = state.board.length;
  return (
    isIndexInRange(state.currentPlayerIndex, state.players.length) &&
    state.players.every((p) =>
      isIndexInRange((p as Record<string, unknown>).position, boardSize),
    )
  );
}

export function loadGame(): GameState | null {
  try {
    const saved = readWithLegacyFallback(STORAGE_KEY, LEGACY_STORAGE_KEY);
    if (!saved) return null;
    // スキーマに合わない保存データ（旧形式・破損・改ざん）は復元しない。
    // economyStatus の未知の値はスキーマの fallback で undefined に落ちる。
    const parsed = v.safeParse(
      GameStateSchema,
      JSON.parse(saved, safeJsonReviver),
    );
    if (!parsed.success) return null;
    const state = parsed.output;
    if (
      state.phase !== 'playing' ||
      state.players.length < MIN_PLAYERS ||
      state.players.length > MAX_PLAYERS
    ) {
      return null;
    }
    // 手番と各プレイヤーの位置は、盤面・プレイヤー配列の添字としてそのまま使われる
    // （`state.players[state.currentPlayerIndex]` / `state.board[player.position]`）。
    // 範囲外だと undefined を読んでクラッシュするため、復元しない。
    if (!hasValidIndices(state)) {
      return null;
    }
    // 行動経済学拡張: バイアス状態は深く検証する。不正な形は捨て（バブルなし＝平常に戻る）、
    // 機能 OFF の保存データに残っていた状態は持ち越さない。
    if (state.behavioralBias !== undefined) {
      state.behavioralBias = isBehavioralBiasActive(state.features)
        ? sanitizeBiasState(state.behavioralBias)
        : undefined;
    }
    return state;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // silently fail
  }
}

export function saveSetupConfig(config: SetupConfig): void {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(config));
  } catch {
    // localStorage full or unavailable - silently fail
  }
}

/**
 * localStorage からセットアップ設定を読み込み、バリデーション済みの SetupConfig を返す。
 * 設定が存在しない・不正値の場合は null を返す。名前はコードポイント単位で MAX_NAME_LENGTH 以下であること。
 */
export function loadSetupConfig(): SetupConfig | null {
  try {
    const saved = readWithLegacyFallback(SETUP_KEY, LEGACY_SETUP_KEY);
    if (!saved) return null;
    const parsed = v.safeParse(
      SetupConfigSchema,
      JSON.parse(saved, safeJsonReviver),
    );
    return parsed.success ? parsed.output : null;
  } catch {
    return null;
  }
}

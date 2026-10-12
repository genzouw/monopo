import type {
  ColorGroup,
  EconomyStatus,
  FeatureFlags,
  GameState,
} from './types';
import type {
  BehavioralBiasState,
  BiasMarketState,
  BiasTurnNet,
} from './systems/behavioralBias';
import { STOCK_COLOR_GROUPS } from './economy';
import { isBehavioralBiasActive } from './systems/behavioralBias';
import {
  TOKENS,
  MIN_PLAYERS,
  MAX_PLAYERS,
  MAX_NAME_LENGTH,
  RAW_LENGTH_LIMIT_MULTIPLIER,
} from './types';

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
// サロゲートペア等を考慮したコードユニット長の上限（DoS対策の早期リジェクト用）
const MAX_NAME_UNIT_LENGTH = MAX_NAME_LENGTH * RAW_LENGTH_LIMIT_MULTIPLIER;
// P2-a 拡張: economyStatus として許容する値（不正値は loadGame でトリムし、
// EconomyIndicator / LOAN_INTEREST_RATES 等での存在しないキー参照によるクラッシュを防ぐ）
const VALID_ECONOMY_STATUSES: readonly EconomyStatus[] = [
  'boom',
  'normal',
  'recession',
  'crisis',
];

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
  for (const color of STOCK_COLOR_GROUPS as ColorGroup[]) {
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

export type SetupConfig = {
  playerCount: number;
  names: string[];
  tokens: string[];
  // P1 拡張: 機能トグル（未指定時は全 OFF＝既存挙動）
  features?: FeatureFlags;
};

export function saveGame(state: GameState): void {
  if (state.phase !== 'playing') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable - silently fail
  }
}

export function loadGame(): GameState | null {
  try {
    const saved = readWithLegacyFallback(STORAGE_KEY, LEGACY_STORAGE_KEY);
    if (!saved) return null;
    const state = JSON.parse(saved, safeJsonReviver) as GameState;
    // Security Enhancement: Validate structure to prevent prototype pollution or crashes from malformed data
    if (
      !state ||
      typeof state !== 'object' ||
      state.phase !== 'playing' ||
      !Array.isArray(state.players) ||
      state.players.length < MIN_PLAYERS ||
      state.players.length > MAX_PLAYERS ||
      !state.players.every(
        (p) =>
          p !== null &&
          typeof p === 'object' &&
          'name' in p &&
          typeof (p as Record<string, unknown>).name === 'string' &&
          // eslint-disable-next-line no-control-regex
          !/[\x00-\x1F\x7F]/.test(
            (p as Record<string, unknown>).name as string,
          ),
      )
    ) {
      return null;
    }
    // Security Enhancement: economyStatus は macroEconomy 有効時に
    // ECONOMY_DISPLAY / LOAN_INTEREST_RATES 等へそのままキーとして渡されるため、
    // 未知の値（改ざん・旧形式データ由来）が残っているとUI描画がクラッシュしうる。
    // 許容値以外は undefined に落として安全側に倒す。
    if (
      state.economyStatus !== undefined &&
      !VALID_ECONOMY_STATUSES.includes(state.economyStatus)
    ) {
      state.economyStatus = undefined;
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
    const config = JSON.parse(saved, safeJsonReviver) as Partial<SetupConfig>;
    if (
      typeof config.playerCount !== 'number' ||
      config.playerCount < MIN_PLAYERS ||
      config.playerCount > MAX_PLAYERS ||
      !Array.isArray(config.names) ||
      !Array.isArray(config.tokens) ||
      config.names.length !== MAX_PLAYERS ||
      config.tokens.length !== MAX_PLAYERS ||
      !config.names.every(
        (n) =>
          typeof n === 'string' &&
          // サロゲートペア分解によるDoSを防ぐための事前チェック（[...n]展開前に上限を絞る）
          n.length <= MAX_NAME_UNIT_LENGTH &&
          [...n].length <= MAX_NAME_LENGTH &&
          // eslint-disable-next-line no-control-regex
          !/[\x00-\x1F\x7F]/.test(n),
      ) ||
      !config.tokens.every(
        (t) =>
          typeof t === 'string' && (TOKENS as readonly string[]).includes(t),
      )
    ) {
      return null;
    }
    // P1 拡張: features は形式チェックのみ（boolean のみ受け入れる）
    let features: FeatureFlags | undefined;
    if (
      config.features &&
      typeof config.features === 'object' &&
      !Array.isArray(config.features)
    ) {
      const f: FeatureFlags = {};
      if (typeof config.features.stocks === 'boolean')
        f.stocks = config.features.stocks;
      if (typeof config.features.insurance === 'boolean')
        f.insurance = config.features.insurance;
      if (typeof config.features.macroEconomy === 'boolean')
        f.macroEconomy = config.features.macroEconomy;
      if (typeof config.features.progressiveTax === 'boolean')
        f.progressiveTax = config.features.progressiveTax;
      if (typeof config.features.loan === 'boolean')
        f.loan = config.features.loan;
      if (typeof config.features.creditScore === 'boolean')
        f.creditScore = config.features.creditScore;
      if (typeof config.features.altAssets === 'boolean')
        f.altAssets = config.features.altAssets;
      if (typeof config.features.behavioralBias === 'boolean')
        f.behavioralBias = config.features.behavioralBias;
      features = f;
    }
    return {
      playerCount: config.playerCount,
      names: config.names,
      tokens: config.tokens,
      features,
    };
  } catch {
    return null;
  }
}

import type { FeatureFlags, GameState } from './types';
import { TOKENS, MIN_PLAYERS, MAX_PLAYERS, MAX_NAME_LENGTH } from './types';

const STORAGE_KEY = 'monopo-save';
const SETUP_KEY = 'monopo-setup';
const LEGACY_STORAGE_KEY = 'monopoly-save';
const LEGACY_SETUP_KEY = 'monopoly-setup';

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
    const state = JSON.parse(saved) as GameState;
    // Security Enhancement: Validate structure to prevent prototype pollution or crashes from malformed data
    if (
      !state ||
      typeof state !== 'object' ||
      state.phase !== 'playing' ||
      !Array.isArray(state.players) ||
      state.players.length < MIN_PLAYERS ||
      state.players.length > MAX_PLAYERS ||
      !state.players.every((p) => p !== null && typeof p === 'object')
    ) {
      return null;
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

export function loadSetupConfig(): SetupConfig | null {
  try {
    const saved = readWithLegacyFallback(SETUP_KEY, LEGACY_SETUP_KEY);
    if (!saved) return null;
    const config = JSON.parse(saved) as Partial<SetupConfig>;
    if (
      typeof config.playerCount !== 'number' ||
      config.playerCount < MIN_PLAYERS ||
      config.playerCount > MAX_PLAYERS ||
      !Array.isArray(config.names) ||
      !Array.isArray(config.tokens) ||
      config.names.length !== MAX_PLAYERS ||
      config.tokens.length !== MAX_PLAYERS ||
      !config.names.every(
        (n) => typeof n === 'string' && [...n].length <= MAX_NAME_LENGTH,
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

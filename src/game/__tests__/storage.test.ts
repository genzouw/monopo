import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveGame,
  loadGame,
  clearSave,
  saveSetupConfig,
  loadSetupConfig,
} from '../storage';
import type { GameState } from '../types';
import { TOKENS } from '../types';

const STORAGE_KEY = 'monopo-save';
const SETUP_KEY = 'monopo-setup';
const LEGACY_STORAGE_KEY = 'monopoly-save';
const LEGACY_SETUP_KEY = 'monopoly-setup';

const createPlayingState = (): GameState =>
  ({
    phase: 'playing',
    players: [
      {
        id: 'p1',
        name: 'たろう',
        token: '🚗',
        money: 1500,
        position: 0,
        properties: [],
        inJail: false,
        jailTurns: 0,
        getOutOfJailCards: 0,
        isBankrupt: false,
      },
      {
        id: 'p2',
        name: 'はなこ',
        token: '🎩',
        money: 1500,
        position: 0,
        properties: [],
        inJail: false,
        jailTurns: 0,
        getOutOfJailCards: 0,
        isBankrupt: false,
      },
    ],
    currentPlayerIndex: 0,
    board: [],
    propertyStates: {},
    cards: { chance: [], communityChest: [] },
    dice: { values: [1, 1], doubles: 0, rolled: false },
    turnPhase: 'roll',
    auction: null,
    trade: null,
    currentCard: null,
    message: '',
    winnerId: null,
  }) as GameState;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('saveGame / loadGame', () => {
  it('phase=playingのstateを保存して復元できる', () => {
    const state = createPlayingState();
    saveGame(state);
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.players[0].name).toBe('たろう');
  });

  it('phase=playing以外のstateは保存しない', () => {
    const state = { ...createPlayingState(), phase: 'setup' } as GameState;
    saveGame(state);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('保存がなければnullを返す', () => {
    expect(loadGame()).toBeNull();
  });

  it('phaseがplayingでない保存データはnullを返す', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...createPlayingState(), phase: 'setup' }),
    );
    expect(loadGame()).toBeNull();
  });

  it('playersが空ならnullを返す', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...createPlayingState(), players: [] }),
    );
    expect(loadGame()).toBeNull();
  });

  it('playersが配列でなければnullを返す', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...createPlayingState(), players: 'not-an-array' }),
    );
    expect(loadGame()).toBeNull();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...createPlayingState(), players: {} }),
    );
    expect(loadGame()).toBeNull();
  });

  it('playersがMIN_PLAYERS未満ならnullを返す', () => {
    const base = createPlayingState();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...base, players: [base.players[0]] }),
    );
    expect(loadGame()).toBeNull();
  });

  it('playersにnullや非オブジェクトが含まれていればnullを返す', () => {
    const base = createPlayingState();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...base, players: [base.players[0], null] }),
    );
    expect(loadGame()).toBeNull();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...base, players: [base.players[0], 'string'] }),
    );
    expect(loadGame()).toBeNull();
  });

  it('壊れたJSONはnullを返す', () => {
    localStorage.setItem(STORAGE_KEY, '{ invalid json');
    expect(loadGame()).toBeNull();
  });

  it('saveGameはlocalStorageの例外を握りつぶす', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota exceeded');
      });
    expect(() => saveGame(createPlayingState())).not.toThrow();
    spy.mockRestore();
  });
});

describe('legacy key migration', () => {
  it('旧キー(monopoly-save)のデータを読み込んで新キーに移行する', () => {
    const legacyState = createPlayingState();
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyState));
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.players[0].name).toBe('たろう');
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });

  it('新キーが存在する場合は旧キーを参照しない', () => {
    const newState = createPlayingState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({
        ...newState,
        players: [{ ...newState.players[0], name: 'old' }],
      }),
    );
    expect(loadGame()?.players[0].name).toBe('たろう');
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).not.toBeNull();
  });

  it('旧キー(monopoly-setup)のSetupConfigを読み込んで新キーに移行する', () => {
    const legacyConfig = {
      playerCount: 3,
      names: ['A', 'B', 'C', 'D'],
      tokens: [TOKENS[0], TOKENS[1], TOKENS[2], TOKENS[3]],
    };
    localStorage.setItem(LEGACY_SETUP_KEY, JSON.stringify(legacyConfig));
    expect(loadSetupConfig()).toEqual(legacyConfig);
    expect(localStorage.getItem(SETUP_KEY)).not.toBeNull();
    expect(localStorage.getItem(LEGACY_SETUP_KEY)).toBeNull();
  });
});

describe('clearSave', () => {
  it('保存データを削除する', () => {
    saveGame(createPlayingState());
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    clearSave();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('旧キーの保存データも削除する', () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, 'something');
    clearSave();
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });

  it('removeItem例外を握りつぶす', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementation(() => {
        throw new Error('failed');
      });
    expect(() => clearSave()).not.toThrow();
    spy.mockRestore();
  });
});

describe('saveSetupConfig / loadSetupConfig', () => {
  const validConfig = {
    playerCount: 3,
    names: ['A', 'B', 'C', 'D'],
    tokens: [TOKENS[0], TOKENS[1], TOKENS[2], TOKENS[3]],
  };

  it('正常な設定を保存して復元できる', () => {
    saveSetupConfig(validConfig);
    expect(loadSetupConfig()).toEqual(validConfig);
  });

  it('保存がなければnullを返す', () => {
    expect(loadSetupConfig()).toBeNull();
  });

  it('壊れたJSONはnullを返す', () => {
    localStorage.setItem(SETUP_KEY, 'not-json');
    expect(loadSetupConfig()).toBeNull();
  });

  it('playerCountが範囲外ならnullを返す', () => {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({ ...validConfig, playerCount: 5 }),
    );
    expect(loadSetupConfig()).toBeNull();
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({ ...validConfig, playerCount: 1 }),
    );
    expect(loadSetupConfig()).toBeNull();
  });

  it('playerCountが数値でなければnullを返す', () => {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({ ...validConfig, playerCount: '3' }),
    );
    expect(loadSetupConfig()).toBeNull();
  });

  it('namesの長さが4でなければnullを返す', () => {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({ ...validConfig, names: ['A', 'B', 'C'] }),
    );
    expect(loadSetupConfig()).toBeNull();
  });

  it('tokensの長さが4でなければnullを返す', () => {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({ ...validConfig, tokens: [TOKENS[0]] }),
    );
    expect(loadSetupConfig()).toBeNull();
  });

  it('namesが配列でなければnullを返す', () => {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({ ...validConfig, names: 'ABCD' }),
    );
    expect(loadSetupConfig()).toBeNull();
  });

  it('tokensが配列でなければnullを返す', () => {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({ ...validConfig, tokens: 'XXXX' }),
    );
    expect(loadSetupConfig()).toBeNull();
  });

  it('namesに非文字列が混ざっていればnullを返す', () => {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({ ...validConfig, names: ['A', 'B', 'C', 1] }),
    );
    expect(loadSetupConfig()).toBeNull();
  });

  it('namesの長さが20文字を超えていればnullを返す', () => {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({
        ...validConfig,
        names: ['A', 'B', 'C', 'A'.repeat(21)],
      }),
    );
    expect(loadSetupConfig()).toBeNull();
  });

  it('絵文字（サロゲートペア）はコードポイント基準で文字数判定する', () => {
    // 絵文字20文字（UTF-16コードユニットでは40だが、コードポイントでは20）はOK
    const ok = '🎩'.repeat(20);
    saveSetupConfig({ ...validConfig, names: [ok, 'B', 'C', 'D'] });
    expect(loadSetupConfig()).not.toBeNull();
    // 絵文字21文字（コードポイント21）はNG
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({
        ...validConfig,
        names: ['🎩'.repeat(21), 'B', 'C', 'D'],
      }),
    );
    expect(loadSetupConfig()).toBeNull();
  });

  it('tokensに未知の値が含まれていればnullを返す', () => {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({
        ...validConfig,
        tokens: [TOKENS[0], TOKENS[1], TOKENS[2], '🦄'],
      }),
    );
    expect(loadSetupConfig()).toBeNull();
  });

  it('saveSetupConfigはlocalStorageの例外を握りつぶす', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota exceeded');
      });
    expect(() => saveSetupConfig(validConfig)).not.toThrow();
    spy.mockRestore();
  });

  // P1 拡張: features の保存・復元
  it('features を含む設定を保存して復元できる', () => {
    saveSetupConfig({
      ...validConfig,
      features: { stocks: true },
    });
    const loaded = loadSetupConfig();
    expect(loaded?.features).toEqual({ stocks: true });
  });

  it('features が未指定なら features は undefined', () => {
    saveSetupConfig(validConfig);
    const loaded = loadSetupConfig();
    expect(loaded?.features).toBeUndefined();
  });

  it('features の非 boolean な値は読み込み時に破棄される', () => {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({
        ...validConfig,
        features: { stocks: 'yes' },
      }),
    );
    const loaded = loadSetupConfig();
    expect(loaded?.features).toEqual({});
  });

  // P2-c 拡張: insurance フラグの保存・復元
  it('features.insurance を保存して復元できる', () => {
    saveSetupConfig({
      ...validConfig,
      features: { insurance: true },
    });
    const loaded = loadSetupConfig();
    expect(loaded?.features).toEqual({ insurance: true });
  });

  // P2-a 拡張: macroEconomy フラグの保存・復元
  it('features.macroEconomy を保存して復元できる', () => {
    saveSetupConfig({
      ...validConfig,
      features: { macroEconomy: true },
    });
    const loaded = loadSetupConfig();
    expect(loaded?.features).toEqual({ macroEconomy: true });
  });

  // Phase 3 拡張: progressiveTax フラグの保存・復元
  it('features.progressiveTax を保存して復元できる', () => {
    saveSetupConfig({
      ...validConfig,
      features: { progressiveTax: true },
    });
    const loaded = loadSetupConfig();
    expect(loaded?.features).toEqual({ progressiveTax: true });
  });

  // Phase 3 拡張: loan フラグの保存・復元
  it('features.loan を保存して復元できる', () => {
    saveSetupConfig({
      ...validConfig,
      features: { loan: true },
    });
    const loaded = loadSetupConfig();
    expect(loaded?.features).toEqual({ loan: true });
  });

  it('features の複数フラグを同時に保存・復元できる', () => {
    saveSetupConfig({
      ...validConfig,
      features: {
        stocks: true,
        insurance: true,
        macroEconomy: false,
        progressiveTax: true,
        loan: true,
      },
    });
    const loaded = loadSetupConfig();
    expect(loaded?.features).toEqual({
      stocks: true,
      insurance: true,
      macroEconomy: false,
      progressiveTax: true,
      loan: true,
    });
  });
});

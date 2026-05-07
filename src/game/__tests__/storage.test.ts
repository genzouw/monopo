import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  saveGame,
  loadGame,
  clearSave,
  saveSetupConfig,
  loadSetupConfig,
} from '../storage'
import type { GameState } from '../types'
import { TOKENS } from '../types'

const STORAGE_KEY = 'monopoly-save'
const SETUP_KEY = 'monopoly-setup'

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
  }) as GameState

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('saveGame / loadGame', () => {
  it('phase=playingのstateを保存して復元できる', () => {
    const state = createPlayingState()
    saveGame(state)
    const loaded = loadGame()
    expect(loaded).not.toBeNull()
    expect(loaded?.players[0].name).toBe('たろう')
  })

  it('phase=playing以外のstateは保存しない', () => {
    const state = { ...createPlayingState(), phase: 'setup' } as GameState
    saveGame(state)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('保存がなければnullを返す', () => {
    expect(loadGame()).toBeNull()
  })

  it('phaseがplayingでない保存データはnullを返す', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...createPlayingState(), phase: 'setup' }),
    )
    expect(loadGame()).toBeNull()
  })

  it('playersが空ならnullを返す', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...createPlayingState(), players: [] }),
    )
    expect(loadGame()).toBeNull()
  })

  it('壊れたJSONはnullを返す', () => {
    localStorage.setItem(STORAGE_KEY, '{ invalid json')
    expect(loadGame()).toBeNull()
  })

  it('saveGameはlocalStorageの例外を握りつぶす', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota exceeded')
      })
    expect(() => saveGame(createPlayingState())).not.toThrow()
    spy.mockRestore()
  })
})

describe('clearSave', () => {
  it('保存データを削除する', () => {
    saveGame(createPlayingState())
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
    clearSave()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('removeItem例外を握りつぶす', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementation(() => {
        throw new Error('failed')
      })
    expect(() => clearSave()).not.toThrow()
    spy.mockRestore()
  })
})

describe('saveSetupConfig / loadSetupConfig', () => {
  const validConfig = {
    playerCount: 3,
    names: ['A', 'B', 'C', 'D'],
    tokens: [TOKENS[0], TOKENS[1], TOKENS[2], TOKENS[3]],
  }

  it('正常な設定を保存して復元できる', () => {
    saveSetupConfig(validConfig)
    expect(loadSetupConfig()).toEqual(validConfig)
  })

  it('保存がなければnullを返す', () => {
    expect(loadSetupConfig()).toBeNull()
  })

  it('壊れたJSONはnullを返す', () => {
    localStorage.setItem(SETUP_KEY, 'not-json')
    expect(loadSetupConfig()).toBeNull()
  })

  it('playerCountが範囲外ならnullを返す', () => {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({ ...validConfig, playerCount: 5 }),
    )
    expect(loadSetupConfig()).toBeNull()
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({ ...validConfig, playerCount: 1 }),
    )
    expect(loadSetupConfig()).toBeNull()
  })

  it('playerCountが数値でなければnullを返す', () => {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({ ...validConfig, playerCount: '3' }),
    )
    expect(loadSetupConfig()).toBeNull()
  })

  it('namesの長さが4でなければnullを返す', () => {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({ ...validConfig, names: ['A', 'B', 'C'] }),
    )
    expect(loadSetupConfig()).toBeNull()
  })

  it('tokensの長さが4でなければnullを返す', () => {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({ ...validConfig, tokens: [TOKENS[0]] }),
    )
    expect(loadSetupConfig()).toBeNull()
  })

  it('namesが配列でなければnullを返す', () => {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({ ...validConfig, names: 'ABCD' }),
    )
    expect(loadSetupConfig()).toBeNull()
  })

  it('tokensが配列でなければnullを返す', () => {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({ ...validConfig, tokens: 'XXXX' }),
    )
    expect(loadSetupConfig()).toBeNull()
  })

  it('namesに非文字列が混ざっていればnullを返す', () => {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({ ...validConfig, names: ['A', 'B', 'C', 1] }),
    )
    expect(loadSetupConfig()).toBeNull()
  })

  it('namesの長さが20文字を超えていればnullを返す', () => {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({
        ...validConfig,
        names: ['A', 'B', 'C', 'A'.repeat(21)],
      }),
    )
    expect(loadSetupConfig()).toBeNull()
  })

  it('tokensに未知の値が含まれていればnullを返す', () => {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({
        ...validConfig,
        tokens: [TOKENS[0], TOKENS[1], TOKENS[2], '🦄'],
      }),
    )
    expect(loadSetupConfig()).toBeNull()
  })

  it('saveSetupConfigはlocalStorageの例外を握りつぶす', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota exceeded')
      })
    expect(() => saveSetupConfig(validConfig)).not.toThrow()
    spy.mockRestore()
  })
})

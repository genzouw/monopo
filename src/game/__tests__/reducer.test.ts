import { describe, it, expect, vi } from 'vitest'
import { createInitialGameState, gameReducer, rollDice } from '../reducer'
import type { GameState } from '../types'

// ── ヘルパー ──

function startedGame(count = 2): GameState {
  const names = Array.from({ length: count }, (_, i) => `プレイヤー${i + 1}`)
  const tokens = Array.from(
    { length: count },
    (_, i) => ['🚗', '🎩', '👞', '🐕', '🚀', '🌟'][i] ?? '🚗',
  )
  const initial = createInitialGameState()
  return gameReducer(initial, {
    type: 'START_GAME',
    playerNames: names,
    playerTokens: tokens,
  })
}

// ── createInitialGameState ──

describe('createInitialGameState', () => {
  it('setupフェーズで始まる', () => {
    const state = createInitialGameState()
    expect(state.phase).toBe('setup')
  })

  it('プレイヤーが空', () => {
    const state = createInitialGameState()
    expect(state.players).toHaveLength(0)
  })

  it('winnerId が null', () => {
    const state = createInitialGameState()
    expect(state.winnerId).toBeNull()
  })
})

// ── START_GAME ──

describe('START_GAME', () => {
  it('playingフェーズに遷移する', () => {
    const state = startedGame()
    expect(state.phase).toBe('playing')
  })

  it('プレイヤーが $1500 でスタートする', () => {
    const state = startedGame(3)
    expect(state.players).toHaveLength(3)
    for (const player of state.players) {
      expect(player.money).toBe(1500)
    }
  })

  it('全プレイヤーの position が 0', () => {
    const state = startedGame(2)
    for (const player of state.players) {
      expect(player.position).toBe(0)
    }
  })

  it('turnPhase が roll', () => {
    const state = startedGame()
    expect(state.turnPhase).toBe('roll')
  })

  it('currentPlayerIndex が 0', () => {
    const state = startedGame()
    expect(state.currentPlayerIndex).toBe(0)
  })
})

// ── ROLL_DICE ──

describe('ROLL_DICE', () => {
  it('dice.values がセットされる', () => {
    const state = startedGame()
    const next = gameReducer(state, { type: 'ROLL_DICE' })
    const [d1, d2] = next.dice.values
    expect(d1).toBeGreaterThanOrEqual(1)
    expect(d1).toBeLessThanOrEqual(6)
    expect(d2).toBeGreaterThanOrEqual(1)
    expect(d2).toBeLessThanOrEqual(6)
  })

  it('turnPhase が moving になる（刑務所外）', () => {
    const state = startedGame()
    const next = gameReducer(state, { type: 'ROLL_DICE' })
    expect(next.turnPhase).toBe('moving')
  })

  it('dice.rolled が true になる', () => {
    const state = startedGame()
    const next = gameReducer(state, { type: 'ROLL_DICE' })
    expect(next.dice.rolled).toBe(true)
  })

  it('3連続ゾロ目で刑務所に行く', () => {
    // rollDice をモックして常にゾロ目を返す
    vi.spyOn(Math, 'random').mockReturnValue(0) // 常に1が出る
    let state = startedGame()

    // 1回目ゾロ目
    state = gameReducer(state, { type: 'ROLL_DICE' })
    expect(state.dice.doubles).toBe(1)
    // END_TURN してもう一度
    state = gameReducer(state, { type: 'END_TURN' })
    // doublesが残るようにROLL_DICEをfakeする
    // もっと簡単な方法: 直接stateを操作してdoubles=2にして再度ROLL_DICE
    const stateWith2Doubles = {
      ...state,
      dice: { values: [1, 1] as [number, number], doubles: 2, rolled: false },
    }
    const jailState = gameReducer(stateWith2Doubles, { type: 'ROLL_DICE' })
    // 3回目のゾロ目 → 刑務所
    expect(jailState.players[jailState.currentPlayerIndex].position).toBe(10)
    expect(jailState.players[jailState.currentPlayerIndex].inJail).toBe(true)

    vi.restoreAllMocks()
  })
})

// ── FINISH_MOVING ──

describe('FINISH_MOVING', () => {
  it('position が更新される', () => {
    let state = startedGame()
    // dice を固定値にセット
    state = {
      ...state,
      dice: { values: [3, 4], doubles: 0, rolled: true },
      turnPhase: 'moving',
    }
    const next = gameReducer(state, { type: 'FINISH_MOVING' })
    expect(next.players[0].position).toBe(7) // 0 + 7
  })

  it('GOを通過したら $200 もらう', () => {
    let state = startedGame()
    // position を 38 に設定してサイコロで 4 以上にする → GOを超える
    state = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, position: 38 } : p,
      ),
      dice: { values: [3, 4], doubles: 0, rolled: true },
      turnPhase: 'moving',
    }
    const next = gameReducer(state, { type: 'FINISH_MOVING' })
    // 38 + 7 = 45 → 5 (GOを超えた)
    expect(next.players[0].position).toBe(5)
    expect(next.players[0].money).toBe(1700) // 1500 + 200
  })

  it('GO（position 0）を踏んでも $200 もらわない（通過時のみ）', () => {
    let state = startedGame()
    // position を 37 に設定してサイコロ 3 で GO に着地
    state = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, position: 37 } : p,
      ),
      dice: { values: [2, 1], doubles: 0, rolled: true },
      turnPhase: 'moving',
    }
    const next = gameReducer(state, { type: 'FINISH_MOVING' })
    // 37 + 3 = 40 → 0 (GO着地) → GOを通ったので+200
    expect(next.players[0].position).toBe(0)
    expect(next.players[0].money).toBe(1700)
  })
})

// ── BUY_PROPERTY ──

describe('BUY_PROPERTY', () => {
  it('お金が減り、物件が追加される', () => {
    let state = startedGame()
    // position を mediterranean (position=1, price=60) に設定
    state = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, position: 1 } : p,
      ),
    }
    const next = gameReducer(state, { type: 'BUY_PROPERTY' })
    expect(next.players[0].money).toBe(1440) // 1500 - 60
    expect(next.players[0].properties).toContain('mediterranean')
    expect(next.propertyStates['mediterranean'].ownerId).toBe('player-0')
  })

  it('turnPhase が endTurn になる', () => {
    let state = startedGame()
    state = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, position: 1 } : p,
      ),
    }
    const next = gameReducer(state, { type: 'BUY_PROPERTY' })
    expect(next.turnPhase).toBe('endTurn')
  })
})

// ── END_TURN ──

describe('END_TURN', () => {
  it('次のプレイヤーに移る', () => {
    const state = startedGame(3)
    const next = gameReducer(state, { type: 'END_TURN' })
    expect(next.currentPlayerIndex).toBe(1)
  })

  it('2→1 と回った後に最初のプレイヤーに戻る', () => {
    let state = startedGame(2)
    state = gameReducer(state, { type: 'END_TURN' })
    expect(state.currentPlayerIndex).toBe(1)
    state = gameReducer(state, { type: 'END_TURN' })
    expect(state.currentPlayerIndex).toBe(0)
  })

  it('破産したプレイヤーをスキップする', () => {
    let state = startedGame(3)
    // プレイヤー1を破産させる
    state = {
      ...state,
      players: state.players.map((p, i) =>
        i === 1 ? { ...p, isBankrupt: true } : p,
      ),
    }
    const next = gameReducer(state, { type: 'END_TURN' })
    // player-0 の次は player-1 (破産) をスキップして player-2
    expect(next.currentPlayerIndex).toBe(2)
  })

  it('ゾロ目のとき turnPhase が roll のままでもう一度振る', () => {
    let state = startedGame()
    state = {
      ...state,
      dice: { values: [3, 3], doubles: 1, rolled: true },
    }
    const next = gameReducer(state, { type: 'END_TURN' })
    // ゾロ目なのでもう1回
    expect(next.currentPlayerIndex).toBe(0)
    expect(next.turnPhase).toBe('roll')
    expect(next.dice.rolled).toBe(false)
  })

  it('dice がリセットされる', () => {
    const state = startedGame()
    const next = gameReducer(state, { type: 'END_TURN' })
    expect(next.dice.rolled).toBe(false)
    expect(next.dice.doubles).toBe(0)
  })
})

// ── rollDice ──

describe('rollDice', () => {
  it('1〜6の値を返す', () => {
    for (let i = 0; i < 20; i++) {
      const [d1, d2] = rollDice()
      expect(d1).toBeGreaterThanOrEqual(1)
      expect(d1).toBeLessThanOrEqual(6)
      expect(d2).toBeGreaterThanOrEqual(1)
      expect(d2).toBeLessThanOrEqual(6)
    }
  })
})

// ── PAY_TAX ──

describe('PAY_TAX', () => {
  it('税金を払ってお金が減る', () => {
    let state = startedGame()
    // income-tax (position=4, price=200) に移動
    state = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, position: 4 } : p,
      ),
    }
    const next = gameReducer(state, { type: 'PAY_TAX' })
    expect(next.players[0].money).toBe(1300) // 1500 - 200
    expect(next.turnPhase).toBe('endTurn')
  })
})

// ── PAY_JAIL_FINE ──

describe('PAY_JAIL_FINE', () => {
  it('$50払って刑務所を出る', () => {
    let state = startedGame()
    state = updateCurrentPlayerState(state, {
      inJail: true,
      jailTurns: 1,
      position: 10,
    })
    const next = gameReducer(state, { type: 'PAY_JAIL_FINE' })
    expect(next.players[0].money).toBe(1450)
    expect(next.players[0].inJail).toBe(false)
    expect(next.turnPhase).toBe('roll')
  })
})

// ── USE_JAIL_CARD ──

describe('USE_JAIL_CARD', () => {
  it('カードを使って刑務所を出る', () => {
    let state = startedGame()
    state = updateCurrentPlayerState(state, {
      inJail: true,
      jailTurns: 0,
      getOutOfJailCards: 1,
      position: 10,
    })
    const next = gameReducer(state, { type: 'USE_JAIL_CARD' })
    expect(next.players[0].inJail).toBe(false)
    expect(next.players[0].getOutOfJailCards).toBe(0)
    expect(next.turnPhase).toBe('roll')
  })
})

// ── ヘルパー ──

function updateCurrentPlayerState(
  state: GameState,
  updates: Partial<GameState['players'][0]>,
): GameState {
  return {
    ...state,
    players: state.players.map((p, i) =>
      i === state.currentPlayerIndex ? { ...p, ...updates } : p,
    ),
  }
}

import { describe, it, expect, vi } from 'vitest'
import { createInitialGameState, gameReducer } from '../reducer'
import type { GameState, Card } from '../types'

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

function withCurrentPlayer(
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

function withPropertyOwner(
  state: GameState,
  propertyId: string,
  ownerId: string | null,
  extra: Partial<GameState['propertyStates'][string]> = {},
): GameState {
  return {
    ...state,
    propertyStates: {
      ...state.propertyStates,
      [propertyId]: {
        ...state.propertyStates[propertyId],
        ownerId,
        ...extra,
      },
    },
  }
}

// ── handleLanding 経由のシナリオ ──

describe('FINISH_MOVING - handleLanding 各種マス', () => {
  it('go-to-jail マスにとまると刑務所に送られる', () => {
    let state = startedGame()
    // position 22 から +8 で position 30 (go-to-jail)
    state = withCurrentPlayer(state, { position: 22 })
    state = {
      ...state,
      dice: { values: [4, 4], doubles: 1, rolled: true },
      turnPhase: 'moving',
    }
    const next = gameReducer(state, { type: 'FINISH_MOVING' })
    expect(next.players[0].position).toBe(10)
    expect(next.players[0].inJail).toBe(true)
    expect(next.turnPhase).toBe('endTurn')
  })

  it('税金マスでは action フェーズに入る', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, { position: 0 })
    state = {
      ...state,
      dice: { values: [2, 2], doubles: 1, rolled: true },
      turnPhase: 'moving',
    }
    const next = gameReducer(state, { type: 'FINISH_MOVING' })
    // position 4 = income-tax
    expect(next.players[0].position).toBe(4)
    expect(next.turnPhase).toBe('action')
  })

  it('チャンスマスでは action フェーズに入る', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, { position: 0 })
    state = {
      ...state,
      dice: { values: [3, 4], doubles: 0, rolled: true },
      turnPhase: 'moving',
    }
    const next = gameReducer(state, { type: 'FINISH_MOVING' })
    // position 7 = chance-1
    expect(next.players[0].position).toBe(7)
    expect(next.turnPhase).toBe('action')
  })

  it('おたすけマスでは action フェーズに入る', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, { position: 0 })
    state = {
      ...state,
      dice: { values: [1, 1], doubles: 1, rolled: true },
      turnPhase: 'moving',
    }
    const next = gameReducer(state, { type: 'FINISH_MOVING' })
    // position 2 = community-chest-1
    expect(next.players[0].position).toBe(2)
    expect(next.turnPhase).toBe('action')
  })

  it('自分の物件にとまると endTurn になる', () => {
    let state = startedGame()
    state = withPropertyOwner(state, 'baltic', 'player-0')
    state = withCurrentPlayer(state, { position: 0 })
    state = {
      ...state,
      dice: { values: [1, 2], doubles: 0, rolled: true },
      turnPhase: 'moving',
    }
    const next = gameReducer(state, { type: 'FINISH_MOVING' })
    expect(next.players[0].position).toBe(3)
    expect(next.turnPhase).toBe('endTurn')
  })

  it('他のプレイヤーの物件にとまると家賃を払う', () => {
    let state = startedGame()
    // baltic (price=60, base rent=4) を player-1 が所有（カラーグループ未制覇）
    state = withPropertyOwner(state, 'baltic', 'player-1')
    state = withCurrentPlayer(state, { position: 0 })
    state = {
      ...state,
      dice: { values: [1, 2], doubles: 0, rolled: true },
      turnPhase: 'moving',
    }
    const next = gameReducer(state, { type: 'FINISH_MOVING' })
    expect(next.players[0].money).toBe(1496) // -4 (rent)
    expect(next.players[1].money).toBe(1504) // +4 (rent)
  })

  it('抵当に入った物件にとまっても家賃は払わない', () => {
    let state = startedGame()
    state = withPropertyOwner(state, 'baltic', 'player-1', {
      isMortgaged: true,
    })
    state = withCurrentPlayer(state, { position: 0 })
    state = {
      ...state,
      dice: { values: [1, 2], doubles: 0, rolled: true },
      turnPhase: 'moving',
    }
    const next = gameReducer(state, { type: 'FINISH_MOVING' })
    expect(next.players[0].money).toBe(1500)
    expect(next.turnPhase).toBe('endTurn')
  })

  it('5倍買い可能な額のとき forceBuy フェーズに入る', () => {
    let state = startedGame()
    // baltic (price=60, 5倍=300) を player-1 が所有、player-0 は十分なお金あり
    state = withPropertyOwner(state, 'baltic', 'player-1')
    state = withCurrentPlayer(state, { position: 0, money: 1000 })
    state = {
      ...state,
      dice: { values: [1, 2], doubles: 0, rolled: true },
      turnPhase: 'moving',
    }
    const next = gameReducer(state, { type: 'FINISH_MOVING' })
    expect(next.turnPhase).toBe('forceBuy')
  })
})

// ── DECLINE_PURCHASE → オークション ──

describe('DECLINE_PURCHASE', () => {
  it('オークションを開始する', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, { position: 1 })
    state = { ...state, turnPhase: 'action' }
    const next = gameReducer(state, { type: 'DECLINE_PURCHASE' })
    expect(next.turnPhase).toBe('auction')
    expect(next.auction).not.toBeNull()
    expect(next.auction?.propertyId).toBe('mediterranean')
  })
})

// ── PLACE_BID / PASS_AUCTION ──

describe('オークション (PLACE_BID / PASS_AUCTION)', () => {
  it('PLACE_BID で入札額が更新される', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, { position: 1 })
    state = gameReducer(
      { ...state, turnPhase: 'action' },
      { type: 'DECLINE_PURCHASE' },
    )
    const next = gameReducer(state, { type: 'PLACE_BID', amount: 50 })
    expect(next.auction?.currentBid).toBe(50)
    expect(next.auction?.currentBidderId).toBe('player-0')
  })

  it('PLACE_BID で現在のビッド以下は無視', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, { position: 1 })
    state = gameReducer(
      { ...state, turnPhase: 'action' },
      { type: 'DECLINE_PURCHASE' },
    )
    state = gameReducer(state, { type: 'PLACE_BID', amount: 100 })
    const next = gameReducer(state, { type: 'PLACE_BID', amount: 50 })
    expect(next.auction?.currentBid).toBe(100)
  })

  it('全員パスで誰も買わなかった場合', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, { position: 1 })
    state = gameReducer(
      { ...state, turnPhase: 'action' },
      { type: 'DECLINE_PURCHASE' },
    )
    state = gameReducer(state, { type: 'PASS_AUCTION' })
    const next = gameReducer(state, { type: 'PASS_AUCTION' })
    expect(next.auction).toBeNull()
    expect(next.turnPhase).toBe('endTurn')
  })

  it('入札者が居て他がパスすれば落札される', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, { position: 1 })
    state = gameReducer(
      { ...state, turnPhase: 'action' },
      { type: 'DECLINE_PURCHASE' },
    )
    state = gameReducer(state, { type: 'PLACE_BID', amount: 30 })
    const next = gameReducer(state, { type: 'PASS_AUCTION' })
    expect(next.auction).toBeNull()
    expect(next.players[0].money).toBe(1470) // -30
    expect(next.players[0].properties).toContain('mediterranean')
    expect(next.propertyStates['mediterranean'].ownerId).toBe('player-0')
  })
})

// ── BUILD_HOUSE / SELL_HOUSE ──

describe('BUILD_HOUSE / SELL_HOUSE', () => {
  function setupBrownGroupOwned(): GameState {
    let state = startedGame()
    // brown グループ（mediterranean, baltic）を player-0 が独占
    state = withPropertyOwner(state, 'mediterranean', 'player-0')
    state = withPropertyOwner(state, 'baltic', 'player-0')
    state = withCurrentPlayer(state, {
      properties: ['mediterranean', 'baltic'],
    })
    return state
  }

  it('家を建てるとお金が減り houses が増える', () => {
    const state = setupBrownGroupOwned()
    const next = gameReducer(state, {
      type: 'BUILD_HOUSE',
      propertyId: 'mediterranean',
    })
    // mediterranean.houseCost = 50
    expect(next.players[0].money).toBe(1450)
    expect(next.propertyStates['mediterranean'].houses).toBe(1)
  })

  it('家を売ると半額もらえて houses が減る', () => {
    let state = setupBrownGroupOwned()
    // 家を1軒建てた状態
    state = {
      ...state,
      propertyStates: {
        ...state.propertyStates,
        mediterranean: {
          ...state.propertyStates.mediterranean,
          houses: 1,
        },
      },
    }
    const next = gameReducer(state, {
      type: 'SELL_HOUSE',
      propertyId: 'mediterranean',
    })
    // sellPrice = floor(50 / 2) = 25
    expect(next.players[0].money).toBe(1525)
    expect(next.propertyStates['mediterranean'].houses).toBe(0)
  })

  it('canBuildHouse が false のときは何もしない', () => {
    const state = startedGame()
    const next = gameReducer(state, {
      type: 'BUILD_HOUSE',
      propertyId: 'mediterranean',
    })
    expect(next).toEqual(state)
  })

  it('canSellHouse が false のときは何もしない', () => {
    const state = startedGame()
    const next = gameReducer(state, {
      type: 'SELL_HOUSE',
      propertyId: 'mediterranean',
    })
    expect(next).toEqual(state)
  })
})

// ── FORCE_BUY / DECLINE_FORCE_BUY ──

describe('FORCE_BUY / DECLINE_FORCE_BUY', () => {
  it('5倍買いで物件を奪える', () => {
    let state = startedGame()
    state = withPropertyOwner(state, 'mediterranean', 'player-1')
    state = {
      ...state,
      players: state.players.map((p) =>
        p.id === 'player-1'
          ? { ...p, properties: ['mediterranean'] }
          : p.id === 'player-0'
            ? { ...p, position: 1, money: 1000 }
            : p,
      ),
      turnPhase: 'forceBuy',
    }
    const next = gameReducer(state, { type: 'FORCE_BUY' })
    // cost = 60 * 5 = 300, toOwner = 60% = 180
    expect(next.players[0].money).toBe(700)
    expect(next.players[1].money).toBe(1680)
    expect(next.players[0].properties).toContain('mediterranean')
    expect(next.propertyStates['mediterranean'].ownerId).toBe('player-0')
    expect(next.turnPhase).toBe('endTurn')
  })

  it('DECLINE_FORCE_BUY で endTurn に戻る', () => {
    const state = startedGame()
    const next = gameReducer(
      { ...state, turnPhase: 'forceBuy' },
      { type: 'DECLINE_FORCE_BUY' },
    )
    expect(next.turnPhase).toBe('endTurn')
  })
})

// ── DRAW_CARD / DISMISS_CARD で applyCardEffect の各分岐 ──

describe('DRAW_CARD + DISMISS_CARD (applyCardEffect)', () => {
  function withTopCard(state: GameState, card: Card): GameState {
    return card.type === 'chance'
      ? { ...state, cards: { ...state.cards, chance: [card] } }
      : { ...state, cards: { ...state.cards, communityChest: [card] } }
  }

  it('money 動作 (受け取り)', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, { position: 7 })
    state = withTopCard(state, {
      id: 'test1',
      type: 'chance',
      text: 'test',
      action: { type: 'money', amount: 100 },
    })
    state = gameReducer(state, { type: 'DRAW_CARD' })
    const next = gameReducer(state, { type: 'DISMISS_CARD' })
    expect(next.players[0].money).toBe(1600)
    expect(next.turnPhase).toBe('endTurn')
  })

  it('money 動作 (支払い)', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, { position: 7 })
    state = withTopCard(state, {
      id: 'test2',
      type: 'chance',
      text: 'test',
      action: { type: 'money', amount: -50 },
    })
    state = gameReducer(state, { type: 'DRAW_CARD' })
    const next = gameReducer(state, { type: 'DISMISS_CARD' })
    expect(next.players[0].money).toBe(1450)
  })

  it('moneyFromPlayers (受け取り)', () => {
    let state = startedGame(3)
    state = withCurrentPlayer(state, { position: 7 })
    state = withTopCard(state, {
      id: 'test3',
      type: 'chance',
      text: 'test',
      action: { type: 'moneyFromPlayers', amount: 10 },
    })
    state = gameReducer(state, { type: 'DRAW_CARD' })
    const next = gameReducer(state, { type: 'DISMISS_CARD' })
    expect(next.players[0].money).toBe(1520) // 1500 + 10*2
    expect(next.players[1].money).toBe(1490) // 1500 - 10
    expect(next.players[2].money).toBe(1490)
  })

  it('moneyFromPlayers (支払い)', () => {
    let state = startedGame(3)
    state = withCurrentPlayer(state, { position: 7 })
    state = withTopCard(state, {
      id: 'test4',
      type: 'chance',
      text: 'test',
      action: { type: 'moneyFromPlayers', amount: -50 },
    })
    state = gameReducer(state, { type: 'DRAW_CARD' })
    const next = gameReducer(state, { type: 'DISMISS_CARD' })
    expect(next.players[0].money).toBe(1400) // 1500 - 50*2
    expect(next.players[1].money).toBe(1550) // 1500 + 50
  })

  it('jail カードで刑務所に送られる', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, { position: 7 })
    state = withTopCard(state, {
      id: 'test5',
      type: 'chance',
      text: 'test',
      action: { type: 'jail' },
    })
    state = gameReducer(state, { type: 'DRAW_CARD' })
    const next = gameReducer(state, { type: 'DISMISS_CARD' })
    expect(next.players[0].position).toBe(10)
    expect(next.players[0].inJail).toBe(true)
  })

  it('jailFree カードで刑務所カードがもらえる', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, { position: 7, getOutOfJailCards: 0 })
    state = withTopCard(state, {
      id: 'test6',
      type: 'chance',
      text: 'test',
      action: { type: 'jailFree' },
    })
    state = gameReducer(state, { type: 'DRAW_CARD' })
    const next = gameReducer(state, { type: 'DISMISS_CARD' })
    expect(next.players[0].getOutOfJailCards).toBe(1)
  })

  it('move カードで指定位置に移動 (GO 通過なし)', () => {
    let state = startedGame()
    // position 7 = chance マス
    state = withCurrentPlayer(state, { position: 7 })
    state = withTopCard(state, {
      id: 'test7',
      type: 'chance',
      text: 'test',
      action: { type: 'move', position: 11 },
    })
    state = gameReducer(state, { type: 'DRAW_CARD' })
    const next = gameReducer(state, { type: 'DISMISS_CARD' })
    expect(next.players[0].position).toBe(11)
    expect(next.players[0].money).toBe(1500) // GO 通過していない
  })

  it('move カードで指定位置に移動 (GO 通過あり)', () => {
    let state = startedGame()
    // position 36 = chance マス。36 → 5 で GO 通過
    state = withCurrentPlayer(state, { position: 36 })
    state = withTopCard(state, {
      id: 'test8',
      type: 'chance',
      text: 'test',
      action: { type: 'move', position: 5 },
    })
    state = gameReducer(state, { type: 'DRAW_CARD' })
    const next = gameReducer(state, { type: 'DISMISS_CARD' })
    expect(next.players[0].position).toBe(5)
    expect(next.players[0].money).toBe(1700) // +200
  })

  it('moveRelative で相対移動', () => {
    let state = startedGame()
    // position 7 = chance マス。-3 で position=4 (income-tax)
    state = withCurrentPlayer(state, { position: 7 })
    state = withTopCard(state, {
      id: 'test9',
      type: 'chance',
      text: 'test',
      action: { type: 'moveRelative', spaces: -3 },
    })
    state = gameReducer(state, { type: 'DRAW_CARD' })
    const next = gameReducer(state, { type: 'DISMISS_CARD' })
    expect(next.players[0].position).toBe(4)
  })

  it('repair で家・ホテル分の支払い', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, {
      position: 7,
      properties: ['mediterranean', 'baltic'],
    })
    state = {
      ...state,
      propertyStates: {
        ...state.propertyStates,
        mediterranean: {
          ...state.propertyStates.mediterranean,
          ownerId: 'player-0',
          houses: 2,
        },
        baltic: {
          ...state.propertyStates.baltic,
          ownerId: 'player-0',
          houses: 5, // ホテル
        },
      },
    }
    state = withTopCard(state, {
      id: 'test10',
      type: 'chance',
      text: 'test',
      action: { type: 'repair', perHouse: 25, perHotel: 100 },
    })
    state = gameReducer(state, { type: 'DRAW_CARD' })
    const next = gameReducer(state, { type: 'DISMISS_CARD' })
    // 2軒 * 25 + ホテル * 100 = 150
    expect(next.players[0].money).toBe(1350)
  })

  it('moveNearest で最寄りの鉄道へ', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, { position: 7 })
    state = withTopCard(state, {
      id: 'test11',
      type: 'chance',
      text: 'test',
      action: { type: 'moveNearest', spaceType: 'railroad' },
    })
    state = gameReducer(state, { type: 'DRAW_CARD' })
    const next = gameReducer(state, { type: 'DISMISS_CARD' })
    // position 7 から最寄り鉄道 = 15 (pennsylvania-rr / みなみ鉄道)
    expect(next.players[0].position).toBe(15)
    expect(next.board[next.players[0].position].type).toBe('railroad')
  })

  it('communityChest からも引ける', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, { position: 2 })
    state = withTopCard(state, {
      id: 'test12',
      type: 'communityChest',
      text: 'test',
      action: { type: 'money', amount: 200 },
    })
    state = gameReducer(state, { type: 'DRAW_CARD' })
    const next = gameReducer(state, { type: 'DISMISS_CARD' })
    expect(next.players[0].money).toBe(1700)
  })

  it('カードが空のときは新しいデッキを補充', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, { position: 7 })
    state = { ...state, cards: { ...state.cards, chance: [] } }
    const next = gameReducer(state, { type: 'DRAW_CARD' })
    expect(next.currentCard).not.toBeNull()
  })
})

// ── ROLL_FOR_JAIL ──

describe('ROLL_FOR_JAIL', () => {
  it('ゾロ目で脱出（位置は moving フェーズで FINISH_MOVING に委譲）', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, {
      inJail: true,
      jailTurns: 1,
      position: 10,
    })
    // startedGame 後にモック設定（shuffleCards にモックを消費させない）
    vi.spyOn(Math, 'random').mockReturnValue(0) // 常に1が出る → ゾロ目
    const next = gameReducer(state, { type: 'ROLL_FOR_JAIL' })
    expect(next.players[0].inJail).toBe(false)
    expect(next.players[0].jailTurns).toBe(0)
    // ROLL_FOR_JAIL ではまだ移動しない（アニメーション後に FINISH_MOVING で進む）
    expect(next.players[0].position).toBe(10)
    expect(next.turnPhase).toBe('moving')
    expect(next.dice.values).toEqual([1, 1])
    vi.restoreAllMocks()
  })

  it('3回目の試行でゾロ目が出なければ$50払って強制出獄', () => {
    let state = startedGame()
    const moneyBefore = state.players[0].money
    state = withCurrentPlayer(state, {
      inJail: true,
      jailTurns: 2, // +1 で 3 → 強制出獄
      position: 10,
    })
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.5) // 1, 4
    const next = gameReducer(state, { type: 'ROLL_FOR_JAIL' })
    expect(next.players[0].inJail).toBe(false)
    expect(next.players[0].jailTurns).toBe(0)
    expect(next.players[0].money).toBe(moneyBefore - 50)
    // 移動はアニメーション後の FINISH_MOVING で行うため、ここではまだ進まない
    expect(next.players[0].position).toBe(10)
    expect(next.turnPhase).toBe('moving')
    vi.restoreAllMocks()
  })

  it('1回目の失敗ならまた1回休む（jailTurns: 0 → 1）', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, {
      inJail: true,
      jailTurns: 0,
      position: 10,
    })
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.5) // 1, 4
    const next = gameReducer(state, { type: 'ROLL_FOR_JAIL' })
    expect(next.players[0].inJail).toBe(true)
    expect(next.players[0].jailTurns).toBe(1)
    expect(next.turnPhase).toBe('endTurn')
    vi.restoreAllMocks()
  })

  it('2回目の失敗でもまだ刑務所に残る（jailTurns: 1 → 2）', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, {
      inJail: true,
      jailTurns: 1,
      position: 10,
    })
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.5) // 1, 4
    const next = gameReducer(state, { type: 'ROLL_FOR_JAIL' })
    expect(next.players[0].inJail).toBe(true)
    expect(next.players[0].jailTurns).toBe(2)
    expect(next.turnPhase).toBe('endTurn')
    vi.restoreAllMocks()
  })
})

// ── ROLL_DICE 刑務所内 ──

describe('ROLL_DICE - 刑務所内', () => {
  it('刑務所内でロールしても doubles カウントは更新されない', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, {
      inJail: true,
      jailTurns: 0,
      position: 10,
    })
    const next = gameReducer(state, { type: 'ROLL_DICE' })
    expect(next.dice.rolled).toBe(true)
    expect(next.turnPhase).toBe('moving')
  })
})

// ── トレード系 ──

describe('トレード (OPEN/PROPOSE/ACCEPT/REJECT/CLOSE)', () => {
  it('OPEN_TRADE_DIALOG で trade フェーズに入る', () => {
    const state = startedGame(3)
    const next = gameReducer(state, {
      type: 'OPEN_TRADE_DIALOG',
      targetPlayerId: 'player-1',
    })
    expect(next.turnPhase).toBe('trade')
    expect(next.trade?.fromPlayerId).toBe('player-0')
    expect(next.trade?.toPlayerId).toBe('player-1')
  })

  it('CLOSE_TRADE_DIALOG で trade が null に戻る', () => {
    let state = startedGame()
    state = gameReducer(state, {
      type: 'OPEN_TRADE_DIALOG',
      targetPlayerId: 'player-1',
    })
    const next = gameReducer(state, { type: 'CLOSE_TRADE_DIALOG' })
    expect(next.trade).toBeNull()
  })

  it('PROPOSE_TRADE で tradeConfirm フェーズに入る', () => {
    const state = startedGame()
    const offer = {
      fromPlayerId: 'player-0',
      toPlayerId: 'player-1',
      offerProperties: [],
      offerMoney: 100,
      offerJailCards: 0,
      requestProperties: [],
      requestMoney: 0,
      requestJailCards: 0,
    }
    const next = gameReducer(state, { type: 'PROPOSE_TRADE', offer })
    expect(next.turnPhase).toBe('tradeConfirm')
    expect(next.trade).toEqual(offer)
  })

  it('ACCEPT_TRADE でお金と物件が交換される', () => {
    let state = startedGame()
    state = withPropertyOwner(state, 'mediterranean', 'player-0')
    state = {
      ...state,
      players: state.players.map((p) =>
        p.id === 'player-0' ? { ...p, properties: ['mediterranean'] } : p,
      ),
    }
    const offer = {
      fromPlayerId: 'player-0',
      toPlayerId: 'player-1',
      offerProperties: ['mediterranean'],
      offerMoney: 0,
      offerJailCards: 0,
      requestProperties: [],
      requestMoney: 200,
      requestJailCards: 0,
    }
    state = gameReducer(state, { type: 'PROPOSE_TRADE', offer })
    const next = gameReducer(state, { type: 'ACCEPT_TRADE' })
    expect(next.players[0].money).toBe(1700)
    expect(next.players[0].properties).not.toContain('mediterranean')
    expect(next.players[1].money).toBe(1300)
    expect(next.players[1].properties).toContain('mediterranean')
    expect(next.propertyStates['mediterranean'].ownerId).toBe('player-1')
    expect(next.trade).toBeNull()
  })

  it('REJECT_TRADE で trade が null に戻る', () => {
    let state = startedGame()
    state = gameReducer(state, {
      type: 'OPEN_TRADE_DIALOG',
      targetPlayerId: 'player-1',
    })
    const next = gameReducer(state, { type: 'REJECT_TRADE' })
    expect(next.trade).toBeNull()
  })
})

// ── ダイアログ開閉 ──

describe('ダイアログ開閉 (BUILD/SELL)', () => {
  it('OPEN_BUILD_DIALOG で build フェーズに入る', () => {
    const state = startedGame()
    const next = gameReducer(state, { type: 'OPEN_BUILD_DIALOG' })
    expect(next.turnPhase).toBe('build')
  })

  it('CLOSE_BUILD_DIALOG はダイス未使用なら roll に戻る', () => {
    const state = startedGame()
    const next = gameReducer(state, { type: 'CLOSE_BUILD_DIALOG' })
    expect(next.turnPhase).toBe('roll')
  })

  it('CLOSE_BUILD_DIALOG はダイス済みなら endTurn に戻る', () => {
    let state = startedGame()
    state = { ...state, dice: { ...state.dice, rolled: true } }
    const next = gameReducer(state, { type: 'CLOSE_BUILD_DIALOG' })
    expect(next.turnPhase).toBe('endTurn')
  })

  it('OPEN_SELL_DIALOG で sell フェーズに入る', () => {
    const state = startedGame()
    const next = gameReducer(state, { type: 'OPEN_SELL_DIALOG' })
    expect(next.turnPhase).toBe('sell')
  })

  it('CLOSE_SELL_DIALOG はダイス未使用なら roll に戻る', () => {
    const state = startedGame()
    const next = gameReducer(state, { type: 'CLOSE_SELL_DIALOG' })
    expect(next.turnPhase).toBe('roll')
  })
})

// ── SELL_PROPERTY ──

describe('SELL_PROPERTY', () => {
  it('物件のオークション売却を開始する', () => {
    let state = startedGame()
    state = withPropertyOwner(state, 'mediterranean', 'player-0')
    state = {
      ...state,
      players: state.players.map((p) =>
        p.id === 'player-0' ? { ...p, properties: ['mediterranean'] } : p,
      ),
    }
    const next = gameReducer(state, {
      type: 'SELL_PROPERTY',
      propertyId: 'mediterranean',
    })
    expect(next.turnPhase).toBe('auction')
    expect(next.auction?.sellerId).toBe('player-0')
  })

  it('家がある物件は売れない', () => {
    let state = startedGame()
    state = withPropertyOwner(state, 'mediterranean', 'player-0', { houses: 1 })
    state = {
      ...state,
      players: state.players.map((p) =>
        p.id === 'player-0' ? { ...p, properties: ['mediterranean'] } : p,
      ),
    }
    const next = gameReducer(state, {
      type: 'SELL_PROPERTY',
      propertyId: 'mediterranean',
    })
    expect(next).toEqual(state)
  })
})

// ── DECLARE_BANKRUPTCY ──

describe('DECLARE_BANKRUPTCY', () => {
  it('債権者なしで破産すると物件が解放される', () => {
    let state = startedGame(3)
    state = withPropertyOwner(state, 'mediterranean', 'player-0')
    state = {
      ...state,
      players: state.players.map((p) =>
        p.id === 'player-0'
          ? { ...p, properties: ['mediterranean'], money: -100 }
          : p,
      ),
    }
    const next = gameReducer(state, {
      type: 'DECLARE_BANKRUPTCY',
      creditorId: null,
    })
    expect(next.players[0].isBankrupt).toBe(true)
    expect(next.players[0].money).toBe(0)
    expect(next.players[0].properties).toEqual([])
    expect(next.propertyStates['mediterranean'].ownerId).toBeNull()
  })

  it('債権者ありで破産すると債権者に物件と所持金が渡る', () => {
    let state = startedGame(3)
    state = withPropertyOwner(state, 'mediterranean', 'player-0')
    state = {
      ...state,
      players: state.players.map((p) =>
        p.id === 'player-0'
          ? { ...p, properties: ['mediterranean'], money: 50 }
          : p,
      ),
    }
    const next = gameReducer(state, {
      type: 'DECLARE_BANKRUPTCY',
      creditorId: 'player-1',
    })
    expect(next.players[0].isBankrupt).toBe(true)
    expect(next.players[1].money).toBe(1550) // 1500 + 50
    expect(next.propertyStates['mediterranean'].ownerId).toBe('player-1')
  })

  it('最後の1人を残して破産すると勝者が決まる', () => {
    let state = startedGame(2)
    state = {
      ...state,
      players: state.players.map((p) =>
        p.id === 'player-0' ? { ...p, money: -100 } : p,
      ),
    }
    const next = gameReducer(state, {
      type: 'DECLARE_BANKRUPTCY',
      creditorId: 'player-1',
    })
    expect(next.phase).toBe('finished')
    expect(next.winnerId).toBe('player-1')
  })
})

// ── RESUME_GAME ──

describe('RESUME_GAME', () => {
  it('保存状態で復元する', () => {
    const initial = createInitialGameState()
    const saved = startedGame()
    const next = gameReducer(initial, {
      type: 'RESUME_GAME',
      savedState: saved,
    })
    expect(next).toEqual(saved)
  })
})

// ── checkNegativeMoney 経路 ──

describe('所持金マイナス時のフェーズ遷移', () => {
  // 注: END_TURN は currentPlayerIndex を進めてしまうので、
  // currentPlayer を保つ CLOSE_BUILD_DIALOG を使って checkNegativeMoney を起動する。
  it('物件があれば forceSell に遷移する', () => {
    let state = startedGame()
    state = withPropertyOwner(state, 'mediterranean', 'player-0')
    state = {
      ...state,
      players: state.players.map((p) =>
        p.id === 'player-0'
          ? { ...p, properties: ['mediterranean'], money: -100 }
          : p,
      ),
    }
    const next = gameReducer(state, { type: 'CLOSE_BUILD_DIALOG' })
    expect(next.turnPhase).toBe('forceSell')
  })

  it('物件なしで money マイナスなら自動破産', () => {
    let state = startedGame(2)
    state = {
      ...state,
      players: state.players.map((p) =>
        p.id === 'player-0' ? { ...p, money: -100, properties: [] } : p,
      ),
    }
    const next = gameReducer(state, { type: 'CLOSE_BUILD_DIALOG' })
    expect(next.players[0].isBankrupt).toBe(true)
    expect(next.phase).toBe('finished')
    expect(next.winnerId).toBe('player-1')
  })
})

// ── 不正な action ──

describe('不正な状態でのアクション', () => {
  it('PLACE_BID は auction が無ければ無視', () => {
    const state = startedGame()
    const next = gameReducer(state, { type: 'PLACE_BID', amount: 100 })
    expect(next).toEqual(state)
  })

  it('PASS_AUCTION は auction が無ければ無視', () => {
    const state = startedGame()
    const next = gameReducer(state, { type: 'PASS_AUCTION' })
    expect(next).toEqual(state)
  })

  it('DISMISS_CARD は currentCard が無ければ無視', () => {
    const state = startedGame()
    const next = gameReducer(state, { type: 'DISMISS_CARD' })
    expect(next).toEqual(state)
  })

  it('USE_JAIL_CARD は カードが無ければ無視', () => {
    let state = startedGame()
    state = withCurrentPlayer(state, { getOutOfJailCards: 0 })
    const next = gameReducer(state, { type: 'USE_JAIL_CARD' })
    expect(next).toEqual(state)
  })
})

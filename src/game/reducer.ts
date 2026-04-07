import type {
  GameState,
  Player,
  Card,
  PropertyState,
  AuctionState,
} from './types'
import type { GameAction } from './actions'
import { BOARD_SPACES, createPropertyStates } from './board'
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS, shuffleCards } from './cards'
import {
  calculateRent,
  canBuildHouse,
  canSellHouse,
  findNearestSpace,
} from './rules'

// ── ヘルパー関数 ──

export function rollDice(): [number, number] {
  return [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]
}

function nextActivePlayer(players: Player[], currentIndex: number): number {
  const total = players.length
  let next = (currentIndex + 1) % total
  let count = 0
  while (players[next].isBankrupt && count < total) {
    next = (next + 1) % total
    count++
  }
  return next
}

function checkWinner(players: Player[]): string | null {
  const active = players.filter((p) => !p.isBankrupt)
  if (active.length === 1) return active[0].id
  return null
}

/**
 * 所持金がマイナスのプレイヤーを検出し:
 * - 物件あり → forceSellフェーズに遷移（強制売りだし）
 * - 物件なし → 自動破産
 */
function checkNegativeMoney(state: GameState): GameState {
  const currentPlayer = state.players[state.currentPlayerIndex]

  // 現在のプレイヤーが所持金マイナスか
  if (!currentPlayer || currentPlayer.isBankrupt || currentPlayer.money >= 0) {
    return state
  }

  // 物件を持っていれば強制売りだし
  // (家がある物件のみの場合もあるので、家を売るか物件を売るか選べるようにする)
  if (currentPlayer.properties.length > 0) {
    return {
      ...state,
      turnPhase: 'forceSell',
      message: `${currentPlayer.name}のおかねがマイナスだよ！物件を売ってお金をつくろう！`,
    }
  }

  // 物件もない → 破産
  const newPlayers = state.players.map((p) =>
    p.id === currentPlayer.id ? { ...p, isBankrupt: true, money: 0 } : p,
  )

  const winnerId = checkWinner(newPlayers)

  return {
    ...state,
    players: newPlayers,
    phase: winnerId ? 'finished' : state.phase,
    winnerId: winnerId ?? state.winnerId,
    turnPhase: 'endTurn',
    message: winnerId
      ? `${newPlayers.find((p) => p.id === winnerId)!.name}のかちだよ！🎉`
      : `${currentPlayer.name}ははさんしたよ…`,
  }
}

function drawCard(
  deck: Card[],
  cardType: 'chance' | 'communityChest',
): { card: Card; newDeck: Card[] } {
  if (deck.length === 0) {
    const fresh =
      cardType === 'chance'
        ? shuffleCards(CHANCE_CARDS)
        : shuffleCards(COMMUNITY_CHEST_CARDS)
    return { card: fresh[0], newDeck: fresh.slice(1) }
  }
  const card = deck[0]
  const newDeck = deck.slice(1)
  return { card, newDeck }
}

function updateCurrentPlayer(
  state: GameState,
  updates: Partial<Player>,
): GameState {
  const players = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, ...updates } : p,
  )
  return { ...state, players }
}

function sendToJail(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex]
  const newState = updateCurrentPlayer(state, {
    position: 10,
    inJail: true,
    jailTurns: 0,
  })
  return {
    ...newState,
    turnPhase: 'endTurn',
    dice: { ...state.dice, doubles: 0 },
    message: `${player.name}は刑務所にいくことになったよ！`,
  }
}

function handleLanding(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex]
  const space = BOARD_SPACES.find((s) => s.position === player.position)!

  switch (space.type) {
    case 'corner': {
      if (space.id === 'go-to-jail') {
        return sendToJail(state)
      }
      // GO, jail (visiting), free-parking: nothing special
      return {
        ...state,
        turnPhase: 'endTurn',
        message: `${space.name}にとまったよ！`,
      }
    }

    case 'tax': {
      return {
        ...state,
        turnPhase: 'action',
        message: `${space.name}！$${space.price}はらってね`,
      }
    }

    case 'chance': {
      return {
        ...state,
        turnPhase: 'action',
        message: `チャンスカードをひいてね！`,
      }
    }

    case 'communityChest': {
      return {
        ...state,
        turnPhase: 'action',
        message: `おたすけカードをひいてね！`,
      }
    }

    case 'property':
    case 'railroad':
    case 'utility': {
      const propState = state.propertyStates[space.id]
      if (!propState) {
        return {
          ...state,
          turnPhase: 'endTurn',
          message: `${space.name}にとまったよ！`,
        }
      }

      // 誰も持っていない
      if (!propState.ownerId) {
        return {
          ...state,
          turnPhase: 'action',
          message: `${space.name}はだれのものでもないよ。$${space.price}で買う？`,
        }
      }

      // 自分が持っている
      if (propState.ownerId === player.id) {
        return {
          ...state,
          turnPhase: 'endTurn',
          message: `${space.name}はじぶんのものだよ！`,
        }
      }

      // 抵当に入っている
      if (propState.isMortgaged) {
        return {
          ...state,
          turnPhase: 'endTurn',
          message: `${space.name}はていとうにはいってるよ。とまり賃なし！`,
        }
      }

      // 他のプレイヤーが持っている → 家賃を払う
      const owner = state.players.find((p) => p.id === propState.ownerId)!
      const rent = calculateRent(
        space.id,
        state.propertyStates,
        state.board,
        state.dice.values,
      )

      const newPlayers = state.players.map((p) => {
        if (p.id === player.id) return { ...p, money: p.money - rent }
        if (p.id === owner.id) return { ...p, money: p.money + rent }
        return p
      })

      // 5倍買い可能かチェック（所持金が足りる場合のみ提示）
      const forceBuyCost = (space.price ?? 0) * 5
      const playerAfterRent = newPlayers.find((p) => p.id === player.id)!
      if (forceBuyCost > 0 && playerAfterRent.money >= forceBuyCost) {
        return {
          ...state,
          players: newPlayers,
          turnPhase: 'forceBuy',
          message: `${owner.name}に$${rent}のとまり賃をはらったよ。$${forceBuyCost}で5ばいがいする？`,
        }
      }

      return {
        ...state,
        players: newPlayers,
        turnPhase: 'endTurn',
        message: `${owner.name}に$${rent}のとまり賃をはらったよ`,
      }
    }

    default:
      return {
        ...state,
        turnPhase: 'endTurn',
        message: `${space.name}にとまったよ！`,
      }
  }
}

function applyCardEffect(state: GameState, card: Card): GameState {
  const player = state.players[state.currentPlayerIndex]
  const action = card.action

  switch (action.type) {
    case 'move': {
      const newPos = action.position
      const passedGo = newPos < player.position && newPos !== 10
      const bonus = passedGo ? 200 : 0
      let newState = updateCurrentPlayer(state, {
        position: newPos,
        money: player.money + bonus,
      })
      if (passedGo) {
        newState = {
          ...newState,
          message: `GOをとおりすぎたから$200もらったよ！`,
        }
      }
      return handleLanding(newState)
    }

    case 'moveRelative': {
      const newPos = (player.position + action.spaces + 40) % 40
      const newState = updateCurrentPlayer(state, { position: newPos })
      return handleLanding(newState)
    }

    case 'money': {
      const newState = updateCurrentPlayer(state, {
        money: player.money + action.amount,
      })
      const msg =
        action.amount >= 0
          ? `$${action.amount}もらったよ！`
          : `$${Math.abs(action.amount)}はらったよ`
      return {
        ...newState,
        turnPhase: 'endTurn',
        message: msg,
      }
    }

    case 'moneyFromPlayers': {
      const amount = action.amount // positive = receive, negative = pay each player
      if (amount > 0) {
        // receive from each player
        const total = amount * (state.players.length - 1)
        const newPlayers = state.players.map((p) => {
          if (p.id === player.id) return { ...p, money: p.money + total }
          return { ...p, money: p.money - amount }
        })
        return {
          ...state,
          players: newPlayers,
          turnPhase: 'endTurn',
          message: `みんなから$${amount}ずつもらったよ！`,
        }
      } else {
        // pay each player
        const payAmount = Math.abs(amount)
        const newPlayers = state.players.map((p) => {
          if (p.id === player.id)
            return {
              ...p,
              money: p.money - payAmount * (state.players.length - 1),
            }
          return { ...p, money: p.money + payAmount }
        })
        return {
          ...state,
          players: newPlayers,
          turnPhase: 'endTurn',
          message: `みんなに$${payAmount}ずつくばったよ`,
        }
      }
    }

    case 'jail': {
      const newState = updateCurrentPlayer(state, {
        position: 10,
        inJail: true,
        jailTurns: 0,
      })
      return {
        ...newState,
        turnPhase: 'endTurn',
        dice: { ...state.dice, doubles: 0 },
        message: `刑務所にいくことになったよ！`,
      }
    }

    case 'jailFree': {
      const newState = updateCurrentPlayer(state, {
        getOutOfJailCards: player.getOutOfJailCards + 1,
      })
      return {
        ...newState,
        turnPhase: 'endTurn',
        message: `刑務所から出られるカードをゲットしたよ！`,
      }
    }

    case 'repair': {
      let cost = 0
      for (const propId of player.properties) {
        const ps = state.propertyStates[propId]
        if (!ps) continue
        if (ps.houses === 5) cost += action.perHotel
        else cost += ps.houses * action.perHouse
      }
      const newState = updateCurrentPlayer(state, {
        money: player.money - cost,
      })
      return {
        ...newState,
        turnPhase: 'endTurn',
        message: `しゅうり代として$${cost}はらったよ`,
      }
    }

    case 'moveNearest': {
      const nearestPos = findNearestSpace(
        player.position,
        action.spaceType,
        state.board,
      )
      const passedGo = nearestPos < player.position
      const bonus = passedGo ? 200 : 0
      let newState = updateCurrentPlayer(state, {
        position: nearestPos,
        money: player.money + bonus,
      })
      if (passedGo) {
        newState = {
          ...newState,
          message: `GOをとおりすぎたから$200もらったよ！`,
        }
      }
      return handleLanding(newState)
    }

    default:
      return { ...state, turnPhase: 'endTurn' }
  }
}

// ── 初期状態 ──

export function createInitialGameState(): GameState {
  return {
    phase: 'setup',
    players: [],
    currentPlayerIndex: 0,
    board: BOARD_SPACES,
    propertyStates: createPropertyStates(),
    cards: {
      chance: shuffleCards(CHANCE_CARDS),
      communityChest: shuffleCards(COMMUNITY_CHEST_CARDS),
    },
    dice: { values: [1, 1], doubles: 0, rolled: false },
    turnPhase: 'roll',
    auction: null,
    trade: null,
    currentCard: null,
    message: 'ゲームをはじめよう！',
    winnerId: null,
  }
}

// ── Reducer ──

export function gameReducer(state: GameState, action: GameAction): GameState {
  const result = gameReducerInner(state, action)
  if (result.phase !== 'playing') return result

  // forceSell中にプラスになったらendTurnに戻す
  if (result.turnPhase === 'forceSell') {
    const player = result.players[result.currentPlayerIndex]
    if (player && player.money >= 0) {
      return {
        ...result,
        turnPhase: 'endTurn',
        message: 'おかねがプラスにもどったよ！',
      }
    }
    // まだマイナスで物件もない → 破産
    if (player && player.properties.length === 0) {
      return checkNegativeMoney(result)
    }
    return result
  }

  // オークション中はスキップ
  if (result.turnPhase === 'auction') return result

  // 通常時の所持金マイナスチェック
  return checkNegativeMoney(result)
  return result
}

function gameReducerInner(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    // ── START_GAME ──
    case 'START_GAME': {
      const players: Player[] = action.playerNames.map((name, i) => ({
        id: `player-${i}`,
        name,
        token: action.playerTokens[i] ?? '🚗',
        money: 1500,
        position: 0,
        properties: [],
        inJail: false,
        jailTurns: 0,
        getOutOfJailCards: 0,
        isBankrupt: false,
      }))
      const firstPlayer = players[0]
      return {
        ...state,
        phase: 'playing',
        players,
        currentPlayerIndex: 0,
        propertyStates: createPropertyStates(),
        cards: {
          chance: shuffleCards(CHANCE_CARDS),
          communityChest: shuffleCards(COMMUNITY_CHEST_CARDS),
        },
        dice: { values: [1, 1], doubles: 0, rolled: false },
        turnPhase: 'roll',
        auction: null,
        trade: null,
        currentCard: null,
        message: `${firstPlayer.name}のばんだよ！サイコロをふろう！`,
        winnerId: null,
      }
    }

    // ── ROLL_DICE ──
    case 'ROLL_DICE': {
      const player = state.players[state.currentPlayerIndex]

      // 刑務所内の場合
      if (player.inJail) {
        // ROLL_FOR_JAIL で処理するのでここでは通常ロールのみ
        const [d1, d2] = rollDice()
        return {
          ...state,
          dice: { values: [d1, d2], doubles: state.dice.doubles, rolled: true },
          turnPhase: 'moving',
          message: `${d1}と${d2}がでたよ！`,
        }
      }

      const [d1, d2] = rollDice()
      const isDoubles = d1 === d2
      const newDoublesCount = isDoubles ? state.dice.doubles + 1 : 0

      // 3回連続ゾロ目 → 刑務所
      if (newDoublesCount >= 3) {
        const newState = updateCurrentPlayer(state, {
          position: 10,
          inJail: true,
          jailTurns: 0,
        })
        return {
          ...newState,
          dice: { values: [d1, d2], doubles: 0, rolled: true },
          turnPhase: 'endTurn',
          message: `3かいれんぞくゾロ目！刑務所にいくことになったよ！`,
        }
      }

      return {
        ...state,
        dice: { values: [d1, d2], doubles: newDoublesCount, rolled: true },
        turnPhase: 'moving',
        message: `${d1}と${d2}がでたよ！${isDoubles ? 'ゾロ目だからもういっかい！' : ''}`,
      }
    }

    // ── FINISH_MOVING ──
    case 'FINISH_MOVING': {
      const player = state.players[state.currentPlayerIndex]
      const steps = state.dice.values[0] + state.dice.values[1]
      const oldPos = player.position
      const newPos = (oldPos + steps) % 40
      const passedGo = oldPos !== 0 && newPos < oldPos

      let newState = updateCurrentPlayer(state, {
        position: newPos,
        money: passedGo && !player.inJail ? player.money + 200 : player.money,
      })

      if (passedGo && !player.inJail) {
        newState = {
          ...newState,
          message: `GOをとおりすぎたから$200もらったよ！`,
        }
      }

      newState = { ...newState, turnPhase: 'landed' }
      return handleLanding(newState)
    }

    // ── BUY_PROPERTY ──
    case 'BUY_PROPERTY': {
      const player = state.players[state.currentPlayerIndex]
      const space = BOARD_SPACES.find((s) => s.position === player.position)
      if (!space || !space.price) return state

      const newPropertyStates: Record<string, PropertyState> = {
        ...state.propertyStates,
        [space.id]: {
          ...state.propertyStates[space.id],
          ownerId: player.id,
        },
      }

      const newState = updateCurrentPlayer(state, {
        money: player.money - space.price,
        properties: [...player.properties, space.id],
      })

      return {
        ...newState,
        propertyStates: newPropertyStates,
        turnPhase: 'endTurn',
        message: `${space.name}を$${space.price}で買ったよ！`,
      }
    }

    // ── DECLINE_PURCHASE ──
    case 'DECLINE_PURCHASE': {
      const player = state.players[state.currentPlayerIndex]
      const space = BOARD_SPACES.find((s) => s.position === player.position)
      if (!space) return state

      const auction: AuctionState = {
        propertyId: space.id,
        currentBid: 0,
        currentBidderId: null,
        passedPlayerIds: [],
        activePlayerIndex: state.currentPlayerIndex,
        sellerId: null,
      }

      return {
        ...state,
        auction,
        turnPhase: 'auction',
        message: `${space.name}のオークションをはじめるよ！`,
      }
    }

    // ── PLACE_BID ──
    case 'PLACE_BID': {
      if (!state.auction) return state
      const auction = state.auction
      const activeBidder = state.players[auction.activePlayerIndex]

      if (action.amount <= auction.currentBid) return state

      const newAuction: AuctionState = {
        ...auction,
        currentBid: action.amount,
        currentBidderId: activeBidder.id,
        activePlayerIndex: nextAuctionPlayer(state, auction),
      }

      return {
        ...state,
        auction: newAuction,
        message: `${activeBidder.name}が$${action.amount}でビッドしたよ！`,
      }
    }

    // ── PASS_AUCTION ──
    case 'PASS_AUCTION': {
      if (!state.auction) return state
      const auction = state.auction
      const activeBidder = state.players[auction.activePlayerIndex]

      const newPassedIds = [...auction.passedPlayerIds, activeBidder.id]
      const activePlayers = state.players.filter(
        (p) => !p.isBankrupt && !newPassedIds.includes(p.id),
      )

      // 全員がパスした or 1人しか残っていない
      if (activePlayers.length <= 1) {
        // 落札者がいれば物件を渡す
        if (auction.currentBidderId) {
          const winner = state.players.find(
            (p) => p.id === auction.currentBidderId,
          )!
          const space = BOARD_SPACES.find((s) => s.id === auction.propertyId)!
          const newPropertyStates: Record<string, PropertyState> = {
            ...state.propertyStates,
            [auction.propertyId]: {
              ...state.propertyStates[auction.propertyId],
              ownerId: winner.id,
              isMortgaged: false,
            },
          }
          const newPlayers = state.players.map((p) => {
            if (p.id === winner.id) {
              return {
                ...p,
                money: p.money - auction.currentBid,
                properties: [...p.properties, auction.propertyId],
              }
            }
            // 売却オークションの場合、売り手にお金を渡し物件を除去
            if (auction.sellerId && p.id === auction.sellerId) {
              return {
                ...p,
                money: p.money + auction.currentBid,
                properties: p.properties.filter(
                  (id) => id !== auction.propertyId,
                ),
              }
            }
            return p
          })
          return {
            ...state,
            players: newPlayers,
            propertyStates: newPropertyStates,
            auction: null,
            turnPhase: 'endTurn',
            message: `${winner.name}が$${auction.currentBid}で${space.name}を落札したよ！`,
          }
        } else {
          // 誰も入札しなかった
          return {
            ...state,
            auction: null,
            turnPhase: 'endTurn',
            message: auction.sellerId
              ? 'だれも買わなかったよ。売れなかった！'
              : 'だれも入札しなかったよ。競売おわり！',
          }
        }
      }

      const newAuction: AuctionState = {
        ...auction,
        passedPlayerIds: newPassedIds,
        activePlayerIndex: nextAuctionPlayer(state, {
          ...auction,
          passedPlayerIds: newPassedIds,
        }),
      }

      return {
        ...state,
        auction: newAuction,
        message: `${activeBidder.name}がパスしたよ！`,
      }
    }

    // ── DRAW_CARD ──
    case 'DRAW_CARD': {
      const player = state.players[state.currentPlayerIndex]
      const space = BOARD_SPACES.find((s) => s.position === player.position)
      if (!space) return state

      const isChance = space.type === 'chance'
      const deck = isChance ? state.cards.chance : state.cards.communityChest
      const { card, newDeck } = drawCard(
        deck,
        isChance ? 'chance' : 'communityChest',
      )

      const newCards = isChance
        ? { ...state.cards, chance: newDeck }
        : { ...state.cards, communityChest: newDeck }

      return {
        ...state,
        cards: newCards,
        currentCard: card,
        turnPhase: 'action',
        message: card.text,
      }
    }

    // ── DISMISS_CARD ──
    case 'DISMISS_CARD': {
      if (!state.currentCard) return state
      const card = state.currentCard
      const newState = { ...state, currentCard: null }
      return applyCardEffect(newState, card)
    }

    // ── PAY_TAX ──
    case 'PAY_TAX': {
      const player = state.players[state.currentPlayerIndex]
      const space = BOARD_SPACES.find((s) => s.position === player.position)
      if (!space || !space.price) return state

      const newState = updateCurrentPlayer(state, {
        money: player.money - space.price,
      })

      return {
        ...newState,
        turnPhase: 'endTurn',
        message: `$${space.price}のぜいきんをはらったよ`,
      }
    }

    // ── BUILD_HOUSE ──
    case 'BUILD_HOUSE': {
      const player = state.players[state.currentPlayerIndex]
      if (
        !canBuildHouse(
          action.propertyId,
          player.id,
          state.propertyStates,
          state.board,
        )
      )
        return state

      const space = state.board.find((s) => s.id === action.propertyId)
      if (!space?.houseCost) return state

      const currentPropState = state.propertyStates[action.propertyId]
      const newPropertyStates: Record<string, PropertyState> = {
        ...state.propertyStates,
        [action.propertyId]: {
          ...currentPropState,
          houses: currentPropState.houses + 1,
        },
      }

      const newState = updateCurrentPlayer(state, {
        money: player.money - space.houseCost,
      })

      const houseName = currentPropState.houses + 1 === 5 ? 'ホテル' : 'おうち'
      return {
        ...newState,
        propertyStates: newPropertyStates,
        message: `${space.name}に${houseName}をたてたよ！`,
      }
    }

    // ── SELL_HOUSE ──
    case 'SELL_HOUSE': {
      const player = state.players[state.currentPlayerIndex]
      if (
        !canSellHouse(
          action.propertyId,
          player.id,
          state.propertyStates,
          state.board,
        )
      )
        return state

      const space = state.board.find((s) => s.id === action.propertyId)
      if (!space?.houseCost) return state

      const currentPropState = state.propertyStates[action.propertyId]
      const sellPrice = Math.floor(space.houseCost / 2)
      const newPropertyStates: Record<string, PropertyState> = {
        ...state.propertyStates,
        [action.propertyId]: {
          ...currentPropState,
          houses: currentPropState.houses - 1,
        },
      }

      const newState = updateCurrentPlayer(state, {
        money: player.money + sellPrice,
      })

      return {
        ...newState,
        propertyStates: newPropertyStates,
        message: `${space.name}のおうちをうったよ！$${sellPrice}もらったよ`,
      }
    }

    // ── FORCE_BUY (5倍買い) ──
    case 'FORCE_BUY': {
      const player = state.players[state.currentPlayerIndex]
      const space = BOARD_SPACES.find((s) => s.position === player.position)!
      const propState = state.propertyStates[space.id]
      if (!propState?.ownerId || propState.ownerId === player.id) return state

      const cost = (space.price ?? 0) * 5
      if (player.money < cost) return state

      const ownerId = propState.ownerId
      const owner = state.players.find((p) => p.id === ownerId)!
      const toOwner = Math.floor(cost * 0.6)

      // 家の取り壊し: 建設費の半額を元の持ち主に返す
      const houseSellBack =
        propState.houses > 0 && space.houseCost
          ? Math.floor(space.houseCost * propState.houses * 0.5)
          : 0

      const newPlayers = state.players.map((p) => {
        if (p.id === player.id) {
          return {
            ...p,
            money: p.money - cost,
            properties: [...p.properties, space.id],
          }
        }
        if (p.id === ownerId) {
          return {
            ...p,
            money: p.money + toOwner + houseSellBack,
            properties: p.properties.filter((id) => id !== space.id),
          }
        }
        return p
      })

      const newPropertyStates = {
        ...state.propertyStates,
        [space.id]: { ownerId: player.id, houses: 0, isMortgaged: false },
      }

      return {
        ...state,
        players: newPlayers,
        propertyStates: newPropertyStates,
        turnPhase: 'endTurn',
        message: `${player.name}が${space.name}を5ばいがいしたよ！（${owner.name}に$${toOwner}${houseSellBack > 0 ? `+おうち分$${houseSellBack}` : ''}）`,
      }
    }

    case 'DECLINE_FORCE_BUY': {
      return { ...state, turnPhase: 'endTurn' }
    }

    // ── SELL_PROPERTY (オークション形式で売り出し) ──
    case 'SELL_PROPERTY': {
      const player = state.players[state.currentPlayerIndex]
      const space = state.board.find((s) => s.id === action.propertyId)
      if (!space) return state

      const propState = state.propertyStates[action.propertyId]
      if (!propState || propState.ownerId !== player.id) return state
      // 家が建っている物件は売れない（先に家を売る必要がある）
      if (propState.houses > 0) return state

      // 開始価格 = 物件価格の半額を10の位で四捨五入
      const startingBid = Math.round((space.price ?? 0) / 2 / 10) * 10

      // 売り手以外でオークション開始
      const firstBidderIndex = nextActivePlayer(
        state.players,
        state.currentPlayerIndex,
      )
      const auction: AuctionState = {
        propertyId: space.id,
        currentBid: startingBid,
        currentBidderId: null,
        passedPlayerIds: [player.id], // 売り手は入札に参加しない
        activePlayerIndex: firstBidderIndex,
        sellerId: player.id,
      }

      return {
        ...state,
        auction,
        turnPhase: 'auction',
        message: `${player.name}が${space.name}を$${startingBid}で売りだしたよ！いくらで買う？`,
      }
    }

    // ── OPEN/CLOSE_BUILD_DIALOG ──
    case 'OPEN_BUILD_DIALOG': {
      return { ...state, turnPhase: 'build' }
    }
    case 'CLOSE_BUILD_DIALOG': {
      const phase = state.dice.rolled ? 'endTurn' : 'roll'
      return { ...state, turnPhase: phase }
    }

    // ── OPEN/CLOSE_SELL_DIALOG ──
    case 'OPEN_SELL_DIALOG': {
      return { ...state, turnPhase: 'sell' }
    }
    case 'CLOSE_SELL_DIALOG': {
      const phase = state.dice.rolled ? 'endTurn' : 'roll'
      return { ...state, turnPhase: phase }
    }

    // ── OPEN_TRADE_DIALOG ──
    case 'OPEN_TRADE_DIALOG': {
      const player = state.players[state.currentPlayerIndex]
      const trade = {
        fromPlayerId: player.id,
        toPlayerId: action.targetPlayerId,
        offerProperties: [],
        offerMoney: 0,
        offerJailCards: 0,
        requestProperties: [],
        requestMoney: 0,
        requestJailCards: 0,
      }
      return { ...state, trade, turnPhase: 'trade' }
    }

    case 'CLOSE_TRADE_DIALOG': {
      const phase = state.dice.rolled ? 'endTurn' : 'roll'
      return { ...state, trade: null, turnPhase: phase }
    }

    // ── PROPOSE_TRADE ──
    case 'PROPOSE_TRADE': {
      return {
        ...state,
        trade: action.offer,
        turnPhase: 'tradeConfirm',
        message: `とりひきのていあんがきたよ！`,
      }
    }

    // ── ACCEPT_TRADE ──
    case 'ACCEPT_TRADE': {
      if (!state.trade) return state
      const offer = state.trade
      const fromPlayer = state.players.find((p) => p.id === offer.fromPlayerId)!
      const toPlayer = state.players.find((p) => p.id === offer.toPlayerId)!

      // プロパティの移転
      const newFromProps = fromPlayer.properties
        .filter((id) => !offer.offerProperties.includes(id))
        .concat(offer.requestProperties)
      const newToProps = toPlayer.properties
        .filter((id) => !offer.requestProperties.includes(id))
        .concat(offer.offerProperties)

      // お金の移動
      const fromMoney = fromPlayer.money - offer.offerMoney + offer.requestMoney
      const toMoney = toPlayer.money + offer.offerMoney - offer.requestMoney

      // 刑務所カードの移転
      const fromJailCards =
        fromPlayer.getOutOfJailCards -
        offer.offerJailCards +
        offer.requestJailCards
      const toJailCards =
        toPlayer.getOutOfJailCards +
        offer.offerJailCards -
        offer.requestJailCards

      // propertyStatesのオーナー更新
      const newPropertyStates = { ...state.propertyStates }
      for (const propId of offer.offerProperties) {
        newPropertyStates[propId] = {
          ...newPropertyStates[propId],
          ownerId: offer.toPlayerId,
        }
      }
      for (const propId of offer.requestProperties) {
        newPropertyStates[propId] = {
          ...newPropertyStates[propId],
          ownerId: offer.fromPlayerId,
        }
      }

      const newPlayers = state.players.map((p) => {
        if (p.id === offer.fromPlayerId)
          return {
            ...p,
            money: fromMoney,
            properties: newFromProps,
            getOutOfJailCards: fromJailCards,
          }
        if (p.id === offer.toPlayerId)
          return {
            ...p,
            money: toMoney,
            properties: newToProps,
            getOutOfJailCards: toJailCards,
          }
        return p
      })

      return {
        ...state,
        players: newPlayers,
        propertyStates: newPropertyStates,
        trade: null,
        turnPhase: state.dice.rolled ? 'endTurn' : 'roll',
        message: `とりひきがせいりつしたよ！`,
      }
    }

    // ── REJECT_TRADE ──
    case 'REJECT_TRADE': {
      return {
        ...state,
        trade: null,
        turnPhase: state.dice.rolled ? 'endTurn' : 'roll',
        message: `とりひきをことわったよ`,
      }
    }

    // ── PAY_JAIL_FINE ──
    case 'PAY_JAIL_FINE': {
      const player = state.players[state.currentPlayerIndex]
      const newState = updateCurrentPlayer(state, {
        money: player.money - 50,
        inJail: false,
        jailTurns: 0,
      })
      return {
        ...newState,
        turnPhase: 'roll',
        dice: { ...state.dice, rolled: false },
        message: `$50はらって刑務所をでたよ！サイコロをふろう！`,
      }
    }

    // ── USE_JAIL_CARD ──
    case 'USE_JAIL_CARD': {
      const player = state.players[state.currentPlayerIndex]
      if (player.getOutOfJailCards <= 0) return state
      const newState = updateCurrentPlayer(state, {
        getOutOfJailCards: player.getOutOfJailCards - 1,
        inJail: false,
        jailTurns: 0,
      })
      return {
        ...newState,
        turnPhase: 'roll',
        dice: { ...state.dice, rolled: false },
        message: `カードをつかって刑務所をでたよ！サイコロをふろう！`,
      }
    }

    // ── ROLL_FOR_JAIL ──
    case 'ROLL_FOR_JAIL': {
      const player = state.players[state.currentPlayerIndex]
      const [d1, d2] = rollDice()
      const isDoubles = d1 === d2

      if (isDoubles) {
        // ゾロ目で脱出
        const steps = d1 + d2
        const newPos = (player.position + steps) % 40
        const passedGo = newPos < player.position
        let newState = updateCurrentPlayer(state, {
          position: newPos,
          inJail: false,
          jailTurns: 0,
          money: passedGo ? player.money + 200 : player.money,
        })
        newState = {
          ...newState,
          dice: { values: [d1, d2], doubles: 0, rolled: true },
          turnPhase: 'landed',
          message: `ゾロ目がでたよ！刑務所をぬけだしたよ！`,
        }
        return handleLanding(newState)
      }

      // ゾロ目でない
      const newJailTurns = player.jailTurns + 1

      // 2回休んだら自動的に脱出（出目の分だけ進む）
      if (newJailTurns >= 2) {
        const steps = d1 + d2
        const newPos = (player.position + steps) % 40
        const passedGo = newPos < player.position
        let newState = updateCurrentPlayer(state, {
          position: newPos,
          inJail: false,
          jailTurns: 0,
          money: passedGo ? player.money + 200 : player.money,
        })
        newState = {
          ...newState,
          dice: { values: [d1, d2], doubles: 0, rolled: true },
          turnPhase: 'landed',
          message: `2かい休んだので刑務所をでたよ！`,
        }
        return handleLanding(newState)
      }

      const newState = updateCurrentPlayer(state, {
        jailTurns: newJailTurns,
      })

      return {
        ...newState,
        dice: { values: [d1, d2], doubles: 0, rolled: true },
        turnPhase: 'endTurn',
        message: `ゾロ目がでなかったよ…もう1かい刑務所にいるよ`,
      }
    }

    // ── DECLARE_BANKRUPTCY ──
    case 'DECLARE_BANKRUPTCY': {
      const player = state.players[state.currentPlayerIndex]
      const creditorId = action.creditorId

      // 物件をすべて没収または債権者に渡す
      const newPropertyStates = { ...state.propertyStates }
      let newPlayers = state.players.map((p) => p)

      for (const propId of player.properties) {
        if (creditorId) {
          newPropertyStates[propId] = {
            ...newPropertyStates[propId],
            ownerId: creditorId,
            houses: 0,
          }
        } else {
          newPropertyStates[propId] = {
            ...newPropertyStates[propId],
            ownerId: null,
            houses: 0,
            isMortgaged: false,
          }
        }
      }

      // お金を債権者に渡す
      if (creditorId) {
        const creditor = newPlayers.find((p) => p.id === creditorId)!
        newPlayers = newPlayers.map((p) => {
          if (p.id === creditorId)
            return { ...p, money: p.money + player.money }
          return p
        })
        void creditor // suppress unused warning
      }

      newPlayers = newPlayers.map((p) => {
        if (p.id === player.id)
          return {
            ...p,
            isBankrupt: true,
            money: 0,
            properties: [],
          }
        return p
      })

      const winnerId = checkWinner(newPlayers)
      const newPhase = winnerId ? 'finished' : state.phase
      const nextIndex = nextActivePlayer(newPlayers, state.currentPlayerIndex)

      return {
        ...state,
        players: newPlayers,
        propertyStates: newPropertyStates,
        phase: newPhase,
        currentPlayerIndex: winnerId ? state.currentPlayerIndex : nextIndex,
        auction: null,
        trade: null,
        turnPhase: 'roll',
        dice: { values: [1, 1], doubles: 0, rolled: false },
        winnerId,
        message: winnerId
          ? `${newPlayers.find((p) => p.id === winnerId)!.name}のかちだよ！`
          : `${player.name}ははさんしたよ…`,
      }
    }

    // ── END_TURN ──
    case 'END_TURN': {
      const player = state.players[state.currentPlayerIndex]
      const isDoubles =
        state.dice.values[0] === state.dice.values[1] && state.dice.rolled

      // ゾロ目でかつ刑務所でなければもう一度
      if (isDoubles && !player.inJail && state.dice.doubles > 0) {
        return {
          ...state,
          turnPhase: 'roll',
          dice: { ...state.dice, rolled: false },
          message: `ゾロ目だからもういっかい！${player.name}のばんがつづくよ！`,
        }
      }

      const nextIndex = nextActivePlayer(
        state.players,
        state.currentPlayerIndex,
      )
      const nextPlayer = state.players[nextIndex]

      return {
        ...state,
        currentPlayerIndex: nextIndex,
        turnPhase: 'roll',
        dice: { values: [1, 1], doubles: 0, rolled: false },
        message: nextPlayer.inJail
          ? `${nextPlayer.name}のばんだよ！刑務所にいるよ`
          : `${nextPlayer.name}のばんだよ！サイコロをふろう！`,
      }
    }

    // ── RESUME_GAME ──
    case 'RESUME_GAME': {
      return action.savedState
    }

    default:
      return state
  }
}

// ── 競売の次のプレイヤーを探すヘルパー ──
function nextAuctionPlayer(state: GameState, auction: AuctionState): number {
  const total = state.players.length
  let next = (auction.activePlayerIndex + 1) % total
  let count = 0
  while (
    (state.players[next].isBankrupt ||
      auction.passedPlayerIds.includes(state.players[next].id)) &&
    count < total
  ) {
    next = (next + 1) % total
    count++
  }
  return next
}

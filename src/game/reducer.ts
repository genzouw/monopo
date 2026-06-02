import type {
  ColorGroup,
  GameState,
  Player,
  Card,
  PropertyState,
  AuctionState,
} from './types';
import type { GameAction } from './actions';
import { BOARD_SPACES, createPropertyStates } from './board';
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS, shuffleCards } from './cards';
import {
  getSpaceById,
  calculateRent,
  canBuildHouse,
  canSellHouse,
  findNearestSpace,
  validateTradeOffer,
  calculateTotalAssets,
} from './rules';
import { getSecureRandomInt } from './random';
import {
  HOUSE_PRICE_BOOST,
  PRICE_DELTA_PER_SHARE,
  calculateNextPrice,
  createInitialStockMarket,
  distributeDividends,
  isStocksEnabled,
  validateStockBuy,
  validateStockSell,
} from './economy';
import {
  FIRE_PROBABILITY,
  calculateFirePayout,
  calculatePremium,
  isInsuranceEnabled,
  isPropertyInsured,
  shouldCollectPremium,
} from './insurance';

// ── 定数 ──

/** 刑務所内でのゾロ目挑戦の最大試行回数（これ以上失敗すると強制出獄） */
export const MAX_JAIL_TURNS = 3;

/** 刑務所から出るための罰金額（PAY_JAIL_FINE / 強制出獄時に支払う） */
export const JAIL_FINE = 50;

/** 社会配当: GOを通過した本人が受け取る金額 */
export const SOCIAL_DIVIDEND_SELF = 150;

/** 社会配当: GOを通過した際に他の破産していないプレイヤーが受け取る金額 */
export const SOCIAL_DIVIDEND_OTHERS = 50;

// ── ヘルパー関数 ──

function distributeSocialDividend(state: GameState, newPos: number): Player[] {
  return state.players.map((p, index) => {
    if (p.isBankrupt) return p;
    if (index === state.currentPlayerIndex) {
      return { ...p, position: newPos, money: p.money + SOCIAL_DIVIDEND_SELF };
    } else {
      return { ...p, money: p.money + SOCIAL_DIVIDEND_OTHERS };
    }
  });
}

export function rollDice(): [number, number] {
  return [getSecureRandomInt(1, 6), getSecureRandomInt(1, 6)];
}

function nextActivePlayer(players: Player[], currentIndex: number): number {
  const total = players.length;
  let next = (currentIndex + 1) % total;
  let count = 0;
  while (players[next].isBankrupt && count < total) {
    next = (next + 1) % total;
    count++;
  }
  return next;
}

function checkWinner(players: Player[]): string | null {
  const active = players.filter((p) => !p.isBankrupt);
  if (active.length === 1) return active[0].id;
  return null;
}

/**
 * 所持金がマイナスのプレイヤーを検出し:
 * - 物件あり → forceSellフェーズに遷移（強制売りだし）
 * - 物件なし → 自動破産
 */
function checkNegativeMoney(state: GameState): GameState {
  const currentPlayer = state.players[state.currentPlayerIndex];

  // 現在のプレイヤーが所持金マイナスか
  if (!currentPlayer || currentPlayer.isBankrupt || currentPlayer.money >= 0) {
    return state;
  }

  // 物件を持っていれば強制売りだし
  // (家がある物件のみの場合もあるので、家を売るか物件を売るか選べるようにする)
  if (currentPlayer.properties.length > 0) {
    return {
      ...state,
      turnPhase: 'forceSell',
      message: `${currentPlayer.name}のおかねがマイナスだよ！物件を売ってお金をつくろう！`,
    };
  }

  // 物件もない → 破産
  const newPlayers = state.players.map((p) =>
    p.id === currentPlayer.id ? { ...p, isBankrupt: true, money: 0 } : p,
  );

  const winnerId = checkWinner(newPlayers);

  return {
    ...state,
    players: newPlayers,
    phase: winnerId ? 'finished' : state.phase,
    winnerId: winnerId ?? state.winnerId,
    turnPhase: 'endTurn',
    message: winnerId
      ? `${newPlayers.find((p) => p.id === winnerId)!.name}のかちだよ！🎉`
      : `${currentPlayer.name}ははさんしたよ…`,
  };
}

function drawCard(
  deck: Card[],
  cardType: 'chance' | 'communityChest',
): { card: Card; newDeck: Card[] } {
  if (deck.length === 0) {
    const fresh =
      cardType === 'chance'
        ? shuffleCards(CHANCE_CARDS)
        : shuffleCards(COMMUNITY_CHEST_CARDS);
    return { card: fresh[0], newDeck: fresh.slice(1) };
  }
  const card = deck[0];
  const newDeck = deck.slice(1);
  return { card, newDeck };
}

function updateCurrentPlayer(
  state: GameState,
  updates: Partial<Player>,
): GameState {
  const players = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, ...updates } : p,
  );
  return { ...state, players };
}

function sendToJail(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];
  const newState = updateCurrentPlayer(state, {
    position: 10,
    inJail: true,
    jailTurns: 0,
  });
  return {
    ...newState,
    turnPhase: 'endTurn',
    dice: { ...state.dice, doubles: 0 },
    message: `${player.name}は刑務所にいくことになったよ！`,
  };
}

function handleLanding(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];
  const space = state.board[player.position];

  switch (space.type) {
    case 'corner': {
      if (space.id === 'go-to-jail') {
        return sendToJail(state);
      }
      // GO, jail (visiting), free-parking: nothing special
      return {
        ...state,
        turnPhase: 'endTurn',
        message: `${space.name}にとまったよ！`,
      };
    }

    case 'tax': {
      return {
        ...state,
        turnPhase: 'action',
        message: `${space.name}！$${space.price}はらってね`,
      };
    }

    case 'chance': {
      return {
        ...state,
        turnPhase: 'action',
        message: `チャンスカードをひいてね！`,
      };
    }

    case 'communityChest': {
      return {
        ...state,
        turnPhase: 'action',
        message: `おたすけカードをひいてね！`,
      };
    }

    case 'property':
    case 'railroad':
    case 'utility': {
      const propState = state.propertyStates[space.id];
      if (!propState) {
        return {
          ...state,
          turnPhase: 'endTurn',
          message: `${space.name}にとまったよ！`,
        };
      }

      // 誰も持っていない
      if (!propState.ownerId) {
        return {
          ...state,
          turnPhase: 'action',
          message: `${space.name}はだれのものでもないよ。$${space.price}で買う？`,
        };
      }

      // 自分が持っている
      if (propState.ownerId === player.id) {
        return {
          ...state,
          turnPhase: 'endTurn',
          message: `${space.name}はじぶんのものだよ！`,
        };
      }

      // 抵当に入っている
      if (propState.isMortgaged) {
        return {
          ...state,
          turnPhase: 'endTurn',
          message: `${space.name}はていとうにはいってるよ。とまり賃なし！`,
        };
      }

      // 他のプレイヤーが持っている → 家賃を払う
      const owner = state.players.find((p) => p.id === propState.ownerId)!;
      const rent = calculateRent(
        space.id,
        state.propertyStates,
        state.board,
        state.dice.values,
      );

      // P1 拡張: 株式が有効なら家賃の一部を配当として株主へ配分
      // プレイヤーの総資産を超える家賃に対して配当を計算すると、破産時に
      // 債権者が損失を被るかお金が不正増殖するため、有効家賃を総資産で上限化する
      const playerAssets = calculateTotalAssets(
        player,
        state.propertyStates,
        state.board,
      );
      const effectiveRent = Math.min(rent, playerAssets);
      const dividends = isStocksEnabled(state)
        ? distributeDividends(
            effectiveRent,
            space.color,
            owner.id,
            player.id,
            state.players,
          )
        : {};
      const dividendPaid = isStocksEnabled(state)
        ? Object.values(dividends).reduce((a, b) => a + b, 0)
        : 0;
      const ownerProceeds = rent - dividendPaid;

      const newPlayers = state.players.map((p) => {
        if (p.id === player.id) return { ...p, money: p.money - rent };
        if (p.id === owner.id) return { ...p, money: p.money + ownerProceeds };
        if (dividends[p.id]) return { ...p, money: p.money + dividends[p.id] };
        return p;
      });

      // 5倍買い可能かチェック（所持金が足りる場合のみ提示）
      const forceBuyCost = (space.price ?? 0) * 5;
      const playerAfterRent = newPlayers.find((p) => p.id === player.id)!;
      if (forceBuyCost > 0 && playerAfterRent.money >= forceBuyCost) {
        return {
          ...state,
          players: newPlayers,
          turnPhase: 'forceBuy',
          message: `${owner.name}に$${rent}のとまり賃をはらったよ。$${forceBuyCost}で5ばいがいする？`,
        };
      }

      return {
        ...state,
        players: newPlayers,
        turnPhase: 'endTurn',
        message: `${owner.name}に$${rent}のとまり賃をはらったよ`,
      };
    }

    default:
      return {
        ...state,
        turnPhase: 'endTurn',
        message: `${space.name}にとまったよ！`,
      };
  }
}

function applyCardEffect(state: GameState, card: Card): GameState {
  const player = state.players[state.currentPlayerIndex];
  const action = card.action;

  switch (action.type) {
    case 'move': {
      const newPos = action.position;
      const passedGo = newPos < player.position && newPos !== 10;

      let newState = { ...state };
      if (passedGo) {
        newState = {
          ...newState,
          players: distributeSocialDividend(state, newPos),
          message: `GOをとおりすぎた！みんなに$${SOCIAL_DIVIDEND_OTHERS}ずつ、自分は$${SOCIAL_DIVIDEND_SELF}の社会配当をもらったよ！`,
        };
      } else {
        newState = updateCurrentPlayer(newState, {
          position: newPos,
        });
      }

      return handleLanding(newState);
    }

    case 'moveRelative': {
      const newPos = (player.position + action.spaces + 40) % 40;
      const passedGo = action.spaces > 0 && newPos < player.position;
      let newState = { ...state };
      if (passedGo) {
        newState = {
          ...newState,
          players: distributeSocialDividend(state, newPos),
          message: `GOをとおりすぎた！みんなに$${SOCIAL_DIVIDEND_OTHERS}ずつ、自分は$${SOCIAL_DIVIDEND_SELF}の社会配当をもらったよ！`,
        };
      } else {
        newState = updateCurrentPlayer(newState, { position: newPos });
      }
      return handleLanding(newState);
    }

    case 'money': {
      const newState = updateCurrentPlayer(state, {
        money: player.money + action.amount,
      });
      const msg =
        action.amount >= 0
          ? `$${action.amount}もらったよ！`
          : `$${Math.abs(action.amount)}はらったよ`;
      return {
        ...newState,
        turnPhase: 'endTurn',
        message: msg,
      };
    }

    case 'moneyFromPlayers': {
      const amount = action.amount; // positive = receive, negative = pay each player
      if (amount > 0) {
        // receive from each player
        const total = amount * (state.players.length - 1);
        const newPlayers = state.players.map((p) => {
          if (p.id === player.id) return { ...p, money: p.money + total };
          return { ...p, money: p.money - amount };
        });
        return {
          ...state,
          players: newPlayers,
          turnPhase: 'endTurn',
          message: `みんなから$${amount}ずつもらったよ！`,
        };
      } else {
        // pay each player
        const payAmount = Math.abs(amount);
        const newPlayers = state.players.map((p) => {
          if (p.id === player.id)
            return {
              ...p,
              money: p.money - payAmount * (state.players.length - 1),
            };
          return { ...p, money: p.money + payAmount };
        });
        return {
          ...state,
          players: newPlayers,
          turnPhase: 'endTurn',
          message: `みんなに$${payAmount}ずつくばったよ`,
        };
      }
    }

    case 'jail': {
      const newState = updateCurrentPlayer(state, {
        position: 10,
        inJail: true,
        jailTurns: 0,
      });
      return {
        ...newState,
        turnPhase: 'endTurn',
        dice: { ...state.dice, doubles: 0 },
        message: `刑務所にいくことになったよ！`,
      };
    }

    case 'jailFree': {
      const newState = updateCurrentPlayer(state, {
        getOutOfJailCards: player.getOutOfJailCards + 1,
      });
      return {
        ...newState,
        turnPhase: 'endTurn',
        message: `刑務所から出られるカードをゲットしたよ！`,
      };
    }

    case 'repair': {
      let cost = 0;
      for (const propId of player.properties) {
        const ps = state.propertyStates[propId];
        if (!ps) continue;
        if (ps.houses === 5) cost += action.perHotel;
        else cost += ps.houses * action.perHouse;
      }
      const newState = updateCurrentPlayer(state, {
        money: player.money - cost,
      });
      return {
        ...newState,
        turnPhase: 'endTurn',
        message: `しゅうり代として$${cost}はらったよ`,
      };
    }

    case 'moveNearest': {
      const nearestPos = findNearestSpace(
        player.position,
        action.spaceType,
        state.board,
      );
      const passedGo = nearestPos < player.position;
      let newState = { ...state };
      if (passedGo) {
        newState = {
          ...newState,
          players: distributeSocialDividend(state, nearestPos),
          message: `GOをとおりすぎた！みんなに$${SOCIAL_DIVIDEND_OTHERS}ずつ、自分は$${SOCIAL_DIVIDEND_SELF}の社会配当をもらったよ！`,
        };
      } else {
        newState = updateCurrentPlayer(newState, { position: nearestPos });
      }
      return handleLanding(newState);
    }

    default:
      return { ...state, turnPhase: 'endTurn' };
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
    turnCount: 0,
  };
}

// ── Reducer ──

export function gameReducer(state: GameState, action: GameAction): GameState {
  const result = gameReducerInner(state, action);
  if (result.phase !== 'playing') return result;

  // forceSell中にプラスになったらendTurnに戻す
  if (result.turnPhase === 'forceSell') {
    const player = result.players[result.currentPlayerIndex];
    if (player && player.money >= 0) {
      return {
        ...result,
        turnPhase: 'endTurn',
        message: 'おかねがプラスにもどったよ！',
      };
    }
    // まだマイナスで物件もない → 破産
    if (player && player.properties.length === 0) {
      return checkNegativeMoney(result);
    }
    return result;
  }

  // オークション中はスキップ
  if (result.turnPhase === 'auction') return result;

  // 通常時の所持金マイナスチェック
  return checkNegativeMoney(result);
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
      }));
      const firstPlayer = players[0];
      // P1 拡張: 株式機能 ON のときだけ市場を初期化（OFF時は undefined のまま既存挙動）
      const stockMarket = action.features?.stocks
        ? createInitialStockMarket()
        : undefined;
      // P2-c 拡張: 保険機能 ON のときだけ保険加入状態を初期化（OFF時は undefined）
      const insuranceState = action.features?.insurance ? {} : undefined;
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
        features: action.features,
        stockMarket,
        insuranceState,
        turnCount: 0,
      };
    }

    // ── ROLL_DICE ──
    case 'ROLL_DICE': {
      const player = state.players[state.currentPlayerIndex];

      // 刑務所内の場合
      if (player.inJail) {
        // ROLL_FOR_JAIL で処理するのでここでは通常ロールのみ
        const [d1, d2] = rollDice();
        return {
          ...state,
          dice: { values: [d1, d2], doubles: state.dice.doubles, rolled: true },
          turnPhase: 'moving',
          message: `${d1}と${d2}がでたよ！`,
        };
      }

      const [d1, d2] = rollDice();
      const isDoubles = d1 === d2;
      const newDoublesCount = isDoubles ? state.dice.doubles + 1 : 0;

      // 3回連続ゾロ目 → 刑務所
      if (newDoublesCount >= 3) {
        const newState = updateCurrentPlayer(state, {
          position: 10,
          inJail: true,
          jailTurns: 0,
        });
        return {
          ...newState,
          dice: { values: [d1, d2], doubles: 0, rolled: true },
          turnPhase: 'endTurn',
          message: `3かいれんぞくゾロ目！刑務所にいくことになったよ！`,
        };
      }

      return {
        ...state,
        dice: { values: [d1, d2], doubles: newDoublesCount, rolled: true },
        turnPhase: 'moving',
        message: `${d1}と${d2}がでたよ！${isDoubles ? 'ゾロ目だからもういっかい！' : ''}`,
      };
    }

    // ── FINISH_MOVING ──
    case 'FINISH_MOVING': {
      const player = state.players[state.currentPlayerIndex];
      const steps = state.dice.values[0] + state.dice.values[1];
      const oldPos = player.position;
      const newPos = (oldPos + steps) % 40;
      const passedGo = oldPos !== 0 && newPos < oldPos;

      let newState = { ...state };
      if (passedGo && !player.inJail) {
        newState = {
          ...newState,
          players: distributeSocialDividend(state, newPos),
          message: `GOをとおりすぎた！みんなに$${SOCIAL_DIVIDEND_OTHERS}ずつ、自分は$${SOCIAL_DIVIDEND_SELF}の社会配当をもらったよ！`,
        };
      } else {
        newState = updateCurrentPlayer(newState, {
          position: newPos,
        });
      }

      newState = { ...newState, turnPhase: 'landed' };
      return handleLanding(newState);
    }

    // ── BUY_PROPERTY ──
    case 'BUY_PROPERTY': {
      const player = state.players[state.currentPlayerIndex];
      const space = state.board[player.position];
      if (!space || !space.price) return state;

      const newPropertyStates: Record<string, PropertyState> = {
        ...state.propertyStates,
        [space.id]: {
          ...state.propertyStates[space.id],
          ownerId: player.id,
        },
      };

      const newState = updateCurrentPlayer(state, {
        money: player.money - space.price,
        properties: [...player.properties, space.id],
      });

      return {
        ...newState,
        propertyStates: newPropertyStates,
        turnPhase: 'endTurn',
        message: `${space.name}を$${space.price}で買ったよ！`,
      };
    }

    // ── DECLINE_PURCHASE ──
    case 'DECLINE_PURCHASE': {
      const player = state.players[state.currentPlayerIndex];
      const space = state.board[player.position];
      if (!space) return state;

      const startingBid = space.price ?? 0;
      const auction: AuctionState = {
        propertyId: space.id,
        currentBid: startingBid,
        currentBidderId: null,
        passedPlayerIds: [],
        activePlayerIndex: state.currentPlayerIndex,
        sellerId: null,
      };

      return {
        ...state,
        auction,
        turnPhase: 'auction',
        message: `${space.name}のオークションをはじめるよ！開始価格は$${startingBid}！`,
      };
    }

    // ── PLACE_BID ──
    case 'PLACE_BID': {
      if (!state.auction) return state;
      const auction = state.auction;
      const activeBidder = state.players[auction.activePlayerIndex];

      // 初回入札時は開始価格と同額を許容、2回目以降は現在のビッドより大きい必要がある
      const minBid =
        auction.currentBidderId === null
          ? auction.currentBid
          : auction.currentBid + 1;
      if (action.amount < minBid) return state;

      const newAuction: AuctionState = {
        ...auction,
        currentBid: action.amount,
        currentBidderId: activeBidder.id,
        activePlayerIndex: nextAuctionPlayer(state, auction),
      };

      return {
        ...state,
        auction: newAuction,
        message: `${activeBidder.name}が$${action.amount}でビッドしたよ！`,
      };
    }

    // ── PASS_AUCTION ──
    case 'PASS_AUCTION': {
      if (!state.auction) return state;
      const auction = state.auction;
      const activeBidder = state.players[auction.activePlayerIndex];

      const newPassedIds = [...auction.passedPlayerIds, activeBidder.id];
      const activePlayers = state.players.filter(
        (p) => !p.isBankrupt && !newPassedIds.includes(p.id),
      );

      // 終了判定:
      //   入札者あり → 残りが入札者だけ (1人以下) になったら終了
      //   入札者なし → 全員がパスする (0人) まで終了させない（次の人に回す）
      const auctionEnded = auction.currentBidderId
        ? activePlayers.length <= 1
        : activePlayers.length === 0;

      if (auctionEnded) {
        // 落札者がいれば物件を渡す
        if (auction.currentBidderId) {
          const winner = state.players.find(
            (p) => p.id === auction.currentBidderId,
          )!;
          const space = getSpaceById(auction.propertyId, state.board)!;
          const newPropertyStates: Record<string, PropertyState> = {
            ...state.propertyStates,
            [auction.propertyId]: {
              ...state.propertyStates[auction.propertyId],
              ownerId: winner.id,
              isMortgaged: false,
            },
          };
          const newPlayers = state.players.map((p) => {
            if (p.id === winner.id) {
              return {
                ...p,
                money: p.money - auction.currentBid,
                properties: [...p.properties, auction.propertyId],
              };
            }
            // 売却オークションの場合、売り手にお金を渡し物件を除去
            if (auction.sellerId && p.id === auction.sellerId) {
              return {
                ...p,
                money: p.money + auction.currentBid,
                properties: p.properties.filter(
                  (id) => id !== auction.propertyId,
                ),
              };
            }
            return p;
          });
          return {
            ...state,
            players: newPlayers,
            propertyStates: newPropertyStates,
            auction: null,
            turnPhase: 'endTurn',
            message: `${winner.name}が$${auction.currentBid}で${space.name}を落札したよ！`,
          };
        }

        // 誰も入札しなかった
        // 売却オークション (SELL_PROPERTY 由来) の場合は、売却者に開始価格を入金し
        // 物件は空白地化する
        if (auction.sellerId) {
          const space = getSpaceById(auction.propertyId, state.board)!;
          const newPlayers = state.players.map((p) => {
            if (p.id === auction.sellerId) {
              return {
                ...p,
                money: p.money + auction.currentBid,
                properties: p.properties.filter(
                  (id) => id !== auction.propertyId,
                ),
              };
            }
            return p;
          });
          const newPropertyStates: Record<string, PropertyState> = {
            ...state.propertyStates,
            [auction.propertyId]: {
              ...state.propertyStates[auction.propertyId],
              ownerId: null,
              isMortgaged: false,
              houses: 0,
            },
          };
          return {
            ...state,
            players: newPlayers,
            propertyStates: newPropertyStates,
            auction: null,
            turnPhase: 'endTurn',
            message: `だれも買わなかったよ。${space.name}は$${auction.currentBid}で空き地になったよ！`,
          };
        }

        // 通常オークション (DECLINE_PURCHASE 由来) で誰も入札しなかった場合
        return {
          ...state,
          auction: null,
          turnPhase: 'endTurn',
          message: 'だれも入札しなかったよ。競売おわり！',
        };
      }

      const newAuction: AuctionState = {
        ...auction,
        passedPlayerIds: newPassedIds,
        activePlayerIndex: nextAuctionPlayer(state, {
          ...auction,
          passedPlayerIds: newPassedIds,
        }),
      };

      return {
        ...state,
        auction: newAuction,
        message: `${activeBidder.name}がパスしたよ！`,
      };
    }

    // ── DRAW_CARD ──
    case 'DRAW_CARD': {
      const player = state.players[state.currentPlayerIndex];
      const space = state.board[player.position];
      if (!space) return state;

      const isChance = space.type === 'chance';
      const deck = isChance ? state.cards.chance : state.cards.communityChest;
      const { card, newDeck } = drawCard(
        deck,
        isChance ? 'chance' : 'communityChest',
      );

      const newCards = isChance
        ? { ...state.cards, chance: newDeck }
        : { ...state.cards, communityChest: newDeck };

      return {
        ...state,
        cards: newCards,
        currentCard: card,
        turnPhase: 'action',
        message: card.text,
      };
    }

    // ── DISMISS_CARD ──
    case 'DISMISS_CARD': {
      if (!state.currentCard) return state;
      const card = state.currentCard;
      const newState = { ...state, currentCard: null };
      return applyCardEffect(newState, card);
    }

    // ── PAY_TAX ──
    case 'PAY_TAX': {
      const player = state.players[state.currentPlayerIndex];
      const space = state.board[player.position];
      if (!space || !space.price) return state;

      const newState = updateCurrentPlayer(state, {
        money: player.money - space.price,
      });

      return {
        ...newState,
        turnPhase: 'endTurn',
        message: `$${space.price}のぜいきんをはらったよ`,
      };
    }

    // ── BUILD_HOUSE ──
    case 'BUILD_HOUSE': {
      const player = state.players[state.currentPlayerIndex];
      if (
        !canBuildHouse(
          action.propertyId,
          player.id,
          state.propertyStates,
          state.board,
        )
      )
        return state;

      const space = getSpaceById(action.propertyId, state.board);
      if (!space?.houseCost) return state;

      const currentPropState = state.propertyStates[action.propertyId];
      const newPropertyStates: Record<string, PropertyState> = {
        ...state.propertyStates,
        [action.propertyId]: {
          ...currentPropState,
          houses: currentPropState.houses + 1,
        },
      };

      const newState = updateCurrentPlayer(state, {
        money: player.money - space.houseCost,
      });

      const houseName = currentPropState.houses + 1 === 5 ? 'ホテル' : 'おうち';
      // P1 拡張: 物件の家・ホテル建設で対象エリアの株価を上昇
      const boostedState = applyHousePriceBoost(
        newState,
        space.color,
        HOUSE_PRICE_BOOST,
      );
      return {
        ...boostedState,
        propertyStates: newPropertyStates,
        message: `${space.name}に${houseName}をたてたよ！`,
      };
    }

    // ── SELL_HOUSE ──
    case 'SELL_HOUSE': {
      const player = state.players[state.currentPlayerIndex];
      if (
        !canSellHouse(
          action.propertyId,
          player.id,
          state.propertyStates,
          state.board,
        )
      )
        return state;

      const space = getSpaceById(action.propertyId, state.board);
      if (!space?.houseCost) return state;

      const currentPropState = state.propertyStates[action.propertyId];
      const sellPrice = Math.floor(space.houseCost / 2);
      const newPropertyStates: Record<string, PropertyState> = {
        ...state.propertyStates,
        [action.propertyId]: {
          ...currentPropState,
          houses: currentPropState.houses - 1,
        },
      };

      const newState = updateCurrentPlayer(state, {
        money: player.money + sellPrice,
      });

      // P1 拡張: 家・ホテル売却で対象エリアの株価を下降（建設と対称）
      const boostedState = applyHousePriceBoost(
        newState,
        space.color,
        -HOUSE_PRICE_BOOST,
      );
      return {
        ...boostedState,
        propertyStates: newPropertyStates,
        message: `${space.name}のおうちをうったよ！$${sellPrice}もらったよ`,
      };
    }

    // ── FORCE_BUY (5倍買い) ──
    case 'FORCE_BUY': {
      const player = state.players[state.currentPlayerIndex];
      const space = state.board[player.position]!;
      const propState = state.propertyStates[space.id];
      if (!propState?.ownerId || propState.ownerId === player.id) return state;

      const cost = (space.price ?? 0) * 5;
      if (player.money < cost) return state;

      const ownerId = propState.ownerId;
      const owner = state.players.find((p) => p.id === ownerId)!;
      const toOwner = Math.floor(cost * 0.6);

      // 家の取り壊し: 建設費の半額を元の持ち主に返す
      const houseSellBack =
        propState.houses > 0 && space.houseCost
          ? Math.floor(space.houseCost * propState.houses * 0.5)
          : 0;

      const newPlayers = state.players.map((p) => {
        if (p.id === player.id) {
          return {
            ...p,
            money: p.money - cost,
            properties: [...p.properties, space.id],
          };
        }
        if (p.id === ownerId) {
          return {
            ...p,
            money: p.money + toOwner + houseSellBack,
            properties: p.properties.filter((id) => id !== space.id),
          };
        }
        return p;
      });

      const newPropertyStates = {
        ...state.propertyStates,
        [space.id]: { ownerId: player.id, houses: 0, isMortgaged: false },
      };

      return {
        ...state,
        players: newPlayers,
        propertyStates: newPropertyStates,
        turnPhase: 'endTurn',
        message: `${player.name}が${space.name}を5ばいがいしたよ！（${owner.name}に$${toOwner}${houseSellBack > 0 ? `+おうち分$${houseSellBack}` : ''}）`,
      };
    }

    case 'DECLINE_FORCE_BUY': {
      return { ...state, turnPhase: 'endTurn' };
    }

    // ── SELL_PROPERTY (オークション形式で売り出し) ──
    case 'SELL_PROPERTY': {
      const player = state.players[state.currentPlayerIndex];
      const space = getSpaceById(action.propertyId, state.board);
      if (!space) return state;

      const propState = state.propertyStates[action.propertyId];
      if (!propState || propState.ownerId !== player.id) return state;
      // 家が建っている物件は売れない（先に家を売る必要がある）
      if (propState.houses > 0) return state;

      // 開始価格はオーナーなしの状態の購入価格（最低価格）
      const startingBid = space.price ?? 0;

      // 売り手以外でオークション開始
      const firstBidderIndex = nextActivePlayer(
        state.players,
        state.currentPlayerIndex,
      );
      const auction: AuctionState = {
        propertyId: space.id,
        currentBid: startingBid,
        currentBidderId: null,
        passedPlayerIds: [player.id], // 売り手は入札に参加しない
        activePlayerIndex: firstBidderIndex,
        sellerId: player.id,
      };

      return {
        ...state,
        auction,
        turnPhase: 'auction',
        message: `${player.name}が${space.name}を$${startingBid}で売りだしたよ！いくらで買う？`,
      };
    }

    // ── OPEN/CLOSE_BUILD_DIALOG ──
    case 'OPEN_BUILD_DIALOG': {
      return { ...state, turnPhase: 'build' };
    }
    case 'CLOSE_BUILD_DIALOG': {
      const phase = state.dice.rolled ? 'endTurn' : 'roll';
      return { ...state, turnPhase: phase };
    }

    // ── OPEN/CLOSE_SELL_DIALOG ──
    case 'OPEN_SELL_DIALOG': {
      return { ...state, turnPhase: 'sell' };
    }
    case 'CLOSE_SELL_DIALOG': {
      const phase = state.dice.rolled ? 'endTurn' : 'roll';
      return { ...state, turnPhase: phase };
    }

    // ── OPEN_TRADE_DIALOG ──
    case 'OPEN_TRADE_DIALOG': {
      const player = state.players[state.currentPlayerIndex];
      const trade = {
        fromPlayerId: player.id,
        toPlayerId: action.targetPlayerId,
        offerProperties: [],
        offerMoney: 0,
        offerJailCards: 0,
        requestProperties: [],
        requestMoney: 0,
        requestJailCards: 0,
      };
      return { ...state, trade, turnPhase: 'trade' };
    }

    case 'CLOSE_TRADE_DIALOG': {
      const phase = state.dice.rolled ? 'endTurn' : 'roll';
      return { ...state, trade: null, turnPhase: phase };
    }

    // ── PROPOSE_TRADE ──
    case 'PROPOSE_TRADE': {
      if (!validateTradeOffer(state, action.offer).isValid) return state;
      return {
        ...state,
        trade: action.offer,
        turnPhase: 'tradeConfirm',
        message: `とりひきのていあんがきたよ！`,
      };
    }

    // ── ACCEPT_TRADE ──
    case 'ACCEPT_TRADE': {
      if (!state.trade) return state;
      if (!validateTradeOffer(state, state.trade).isValid) return state;
      const offer = state.trade;
      const fromPlayer = state.players.find(
        (p) => p.id === offer.fromPlayerId,
      )!;
      const toPlayer = state.players.find((p) => p.id === offer.toPlayerId)!;

      // プロパティの移転
      const newFromProps = fromPlayer.properties
        .filter((id) => !offer.offerProperties.includes(id))
        .concat(offer.requestProperties);
      const newToProps = toPlayer.properties
        .filter((id) => !offer.requestProperties.includes(id))
        .concat(offer.offerProperties);

      // お金の移動
      const fromMoney =
        fromPlayer.money - offer.offerMoney + offer.requestMoney;
      const toMoney = toPlayer.money + offer.offerMoney - offer.requestMoney;

      // 刑務所カードの移転
      const fromJailCards =
        fromPlayer.getOutOfJailCards -
        offer.offerJailCards +
        offer.requestJailCards;
      const toJailCards =
        toPlayer.getOutOfJailCards +
        offer.offerJailCards -
        offer.requestJailCards;

      // propertyStatesのオーナー更新
      const newPropertyStates = { ...state.propertyStates };
      for (const propId of offer.offerProperties) {
        newPropertyStates[propId] = {
          ...newPropertyStates[propId],
          ownerId: offer.toPlayerId,
        };
      }
      for (const propId of offer.requestProperties) {
        newPropertyStates[propId] = {
          ...newPropertyStates[propId],
          ownerId: offer.fromPlayerId,
        };
      }

      const newPlayers = state.players.map((p) => {
        if (p.id === offer.fromPlayerId)
          return {
            ...p,
            money: fromMoney,
            properties: newFromProps,
            getOutOfJailCards: fromJailCards,
          };
        if (p.id === offer.toPlayerId)
          return {
            ...p,
            money: toMoney,
            properties: newToProps,
            getOutOfJailCards: toJailCards,
          };
        return p;
      });

      return {
        ...state,
        players: newPlayers,
        propertyStates: newPropertyStates,
        trade: null,
        turnPhase: state.dice.rolled ? 'endTurn' : 'roll',
        message: `とりひきがせいりつしたよ！`,
      };
    }

    // ── REJECT_TRADE ──
    case 'REJECT_TRADE': {
      return {
        ...state,
        trade: null,
        turnPhase: state.dice.rolled ? 'endTurn' : 'roll',
        message: `とりひきをことわったよ`,
      };
    }

    // ── PAY_JAIL_FINE ──
    case 'PAY_JAIL_FINE': {
      const player = state.players[state.currentPlayerIndex];
      const newState = updateCurrentPlayer(state, {
        money: player.money - JAIL_FINE,
        inJail: false,
        jailTurns: 0,
      });
      return {
        ...newState,
        turnPhase: 'roll',
        dice: { ...state.dice, rolled: false },
        message: `$${JAIL_FINE}はらって刑務所をでたよ！サイコロをふろう！`,
      };
    }

    // ── USE_JAIL_CARD ──
    case 'USE_JAIL_CARD': {
      const player = state.players[state.currentPlayerIndex];
      if (player.getOutOfJailCards <= 0) return state;
      const newState = updateCurrentPlayer(state, {
        getOutOfJailCards: player.getOutOfJailCards - 1,
        inJail: false,
        jailTurns: 0,
      });
      return {
        ...newState,
        turnPhase: 'roll',
        dice: { ...state.dice, rolled: false },
        message: `カードをつかって刑務所をでたよ！サイコロをふろう！`,
      };
    }

    // ── ROLL_FOR_JAIL ──
    case 'ROLL_FOR_JAIL': {
      const player = state.players[state.currentPlayerIndex];
      const [d1, d2] = rollDice();
      const isDoubles = d1 === d2;

      if (isDoubles) {
        // ゾロ目で脱出 → 通常の移動アニメーションで進める
        const newState = updateCurrentPlayer(state, {
          inJail: false,
          jailTurns: 0,
        });
        return {
          ...newState,
          dice: { values: [d1, d2], doubles: 0, rolled: true },
          turnPhase: 'moving',
          message: `ゾロ目がでたよ！${d1}と${d2}！刑務所をぬけだしたよ！`,
        };
      }

      // ゾロ目でない
      const newJailTurns = player.jailTurns + 1;

      // 最大試行回数に達したら → 罰金を払って強制出獄、出目の分だけ進む
      if (newJailTurns >= MAX_JAIL_TURNS) {
        const newState = updateCurrentPlayer(state, {
          money: player.money - JAIL_FINE,
          inJail: false,
          jailTurns: 0,
        });
        return {
          ...newState,
          dice: { values: [d1, d2], doubles: 0, rolled: true },
          turnPhase: 'moving',
          message: `${MAX_JAIL_TURNS}かいゾロ目がでなかったから$${JAIL_FINE}はらって刑務所をでたよ！`,
        };
      }

      // 1〜2回目の失敗 → 刑務所続行
      const newState = updateCurrentPlayer(state, {
        jailTurns: newJailTurns,
      });

      return {
        ...newState,
        dice: { values: [d1, d2], doubles: 0, rolled: true },
        turnPhase: 'endTurn',
        message: `ゾロ目がでなかったよ…もう1かい刑務所にいるよ`,
      };
    }

    // ── DECLARE_BANKRUPTCY ──
    case 'DECLARE_BANKRUPTCY': {
      const player = state.players[state.currentPlayerIndex];
      const creditorId = action.creditorId;

      // 物件をすべて没収または債権者に渡す
      const newPropertyStates = { ...state.propertyStates };
      let newPlayers = state.players.map((p) => p);

      for (const propId of player.properties) {
        if (creditorId) {
          newPropertyStates[propId] = {
            ...newPropertyStates[propId],
            ownerId: creditorId,
            houses: 0,
          };
        } else {
          newPropertyStates[propId] = {
            ...newPropertyStates[propId],
            ownerId: null,
            houses: 0,
            isMortgaged: false,
          };
        }
      }

      // お金を債権者に渡す
      if (creditorId) {
        newPlayers = newPlayers.map((p) => {
          if (p.id === creditorId)
            return { ...p, money: p.money + player.money };
          return p;
        });
      }

      newPlayers = newPlayers.map((p) => {
        if (p.id === player.id)
          return {
            ...p,
            isBankrupt: true,
            money: 0,
            properties: [],
          };
        return p;
      });

      const winnerId = checkWinner(newPlayers);
      const newPhase = winnerId ? 'finished' : state.phase;
      const nextIndex = nextActivePlayer(newPlayers, state.currentPlayerIndex);

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
      };
    }

    // ── END_TURN ──
    case 'END_TURN': {
      const player = state.players[state.currentPlayerIndex];
      const isDoubles =
        state.dice.values[0] === state.dice.values[1] && state.dice.rolled;

      // ゾロ目でかつ刑務所でなければもう一度
      if (isDoubles && !player.inJail && state.dice.doubles > 0) {
        return {
          ...state,
          turnPhase: 'roll',
          dice: { ...state.dice, rolled: false },
          message: `ゾロ目だからもういっかい！${player.name}のばんがつづくよ！`,
        };
      }

      const nextIndex = nextActivePlayer(
        state.players,
        state.currentPlayerIndex,
      );
      const nextPlayer = state.players[nextIndex];

      const newTurnCount = (state.turnCount ?? 0) + 1;
      let stateAfterInsurance = { ...state, turnCount: newTurnCount };

      // P2-c 拡張: 保険システム（featureFlag OFF 時は完全スキップ）
      if (isInsuranceEnabled(state)) {
        stateAfterInsurance = applyInsuranceOnEndTurn(
          stateAfterInsurance,
          newTurnCount,
        );
      }

      return {
        ...stateAfterInsurance,
        currentPlayerIndex: nextIndex,
        turnPhase: 'roll',
        dice: { values: [1, 1], doubles: 0, rolled: false },
        message: nextPlayer.inJail
          ? `${nextPlayer.name}のばんだよ！刑務所にいるよ`
          : `${nextPlayer.name}のばんだよ！サイコロをふろう！`,
      };
    }

    // ── RESUME_GAME ──
    case 'RESUME_GAME': {
      return action.savedState;
    }

    // ── P1 拡張: 株式（需要供給モデル） ──
    case 'OPEN_STOCK_DIALOG': {
      if (!isStocksEnabled(state)) return state;
      return { ...state, turnPhase: 'stock' };
    }
    case 'CLOSE_STOCK_DIALOG': {
      if (state.turnPhase !== 'stock') return state;
      return { ...state, turnPhase: 'endTurn' };
    }
    case 'BUY_STOCK': {
      const player = state.players[state.currentPlayerIndex];
      const result = validateStockBuy(
        state,
        player.id,
        action.color,
        action.shares,
      );
      if (!result.ok) return state;
      return applyStockTrade(
        state,
        player.id,
        action.color,
        action.shares,
        -result.cost,
      );
    }
    case 'SELL_STOCK': {
      const player = state.players[state.currentPlayerIndex];
      const result = validateStockSell(
        state,
        player.id,
        action.color,
        action.shares,
      );
      if (!result.ok) return state;
      return applyStockTrade(
        state,
        player.id,
        action.color,
        -action.shares,
        result.proceeds,
      );
    }

    // ── P2-c 拡張: 不動産保険 ──
    case 'BUY_INSURANCE': {
      if (!isInsuranceEnabled(state)) return state;
      const player = state.players[state.currentPlayerIndex];
      const propState = state.propertyStates[action.propertyId];
      // 自分が所有している物件のみ保険加入可
      if (!propState || propState.ownerId !== player.id) return state;
      // すでに加入済みなら変更なし
      if (isPropertyInsured(state.insuranceState, action.propertyId))
        return state;
      const space = getSpaceById(action.propertyId, state.board);
      const premium = calculatePremium(space?.price ?? 0);
      // 保険料が払えない場合は加入不可
      if (player.money < premium) return state;
      const newInsuranceState = {
        ...state.insuranceState,
        [action.propertyId]: true,
      };
      const newState = updateCurrentPlayer(state, {
        money: player.money - premium,
      });
      return {
        ...newState,
        insuranceState: newInsuranceState,
        message: `${space?.name ?? action.propertyId}に保険をかけたよ！$${premium}の保険料をはらったよ`,
      };
    }
    case 'CANCEL_INSURANCE': {
      if (!isInsuranceEnabled(state)) return state;
      const player = state.players[state.currentPlayerIndex];
      const propState = state.propertyStates[action.propertyId];
      if (!propState || propState.ownerId !== player.id) return state;
      if (!isPropertyInsured(state.insuranceState, action.propertyId))
        return state;
      const { [action.propertyId]: _, ...rest } = state.insuranceState ?? {};
      const space = getSpaceById(action.propertyId, state.board);
      return {
        ...state,
        insuranceState: rest,
        message: `${space?.name ?? action.propertyId}の保険をかいじょしたよ`,
      };
    }

    default:
      return state;
  }
}

// ── P1 ヘルパー: 株売買の共通処理（需要供給で株価変動） ──
// sharesDelta: プレイヤーの保有株変化（正: 買い、負: 売り）
// moneyDelta: プレイヤーの所持金変化（負: 買い、正: 売り）
// 価格更新は calculateNextPrice を介して STOCK_MIN_PRICE 下限保証つき。
function applyStockTrade(
  state: GameState,
  playerId: string,
  color: ColorGroup,
  sharesDelta: number,
  moneyDelta: number,
): GameState {
  const newPlayers = state.players.map((p) => {
    if (p.id !== playerId) return p;
    const currentShares = p.stocks?.[color] ?? 0;
    const nextShares = currentShares + sharesDelta;
    const newStocks = { ...(p.stocks ?? {}), [color]: nextShares };
    if (nextShares <= 0) delete newStocks[color];
    return { ...p, money: p.money + moneyDelta, stocks: newStocks };
  });
  const market = state.stockMarket?.[color];
  if (!market) return { ...state, players: newPlayers };
  // 売買 1 株あたり ±PRICE_DELTA_PER_SHARE で価格を動かす（買い=上昇／売り=下降）
  const priceDelta = sharesDelta * PRICE_DELTA_PER_SHARE;
  const nextPrice = calculateNextPrice(market.pricePerShare, priceDelta);
  const newStockMarket = {
    ...state.stockMarket,
    [color]: {
      ...market,
      bankShares: market.bankShares - sharesDelta,
      pricePerShare: nextPrice,
    },
  };
  return { ...state, players: newPlayers, stockMarket: newStockMarket };
}

// ── P1 ヘルパー: 家・ホテル建設/売却による株価ブースト ──
// delta > 0: 建設で株価上昇、delta < 0: 売却で株価下降。
// stocks 機能 OFF または対象色の市場が未初期化なら何もしない（既存挙動互換）。
function applyHousePriceBoost(
  state: GameState,
  color: ColorGroup | undefined,
  delta: number,
): GameState {
  if (!isStocksEnabled(state) || !color) return state;
  const market = state.stockMarket?.[color];
  if (!market) return state;
  return {
    ...state,
    stockMarket: {
      ...state.stockMarket,
      [color]: {
        ...market,
        pricePerShare: calculateNextPrice(market.pricePerShare, delta),
      },
    },
  };
}

// ── 競売の次のプレイヤーを探すヘルパー ──
function nextAuctionPlayer(state: GameState, auction: AuctionState): number {
  const total = state.players.length;
  let next = (auction.activePlayerIndex + 1) % total;
  let count = 0;
  while (
    (state.players[next].isBankrupt ||
      auction.passedPlayerIds.includes(state.players[next].id)) &&
    count < total
  ) {
    next = (next + 1) % total;
    count++;
  }
  return next;
}

// ── P2-c ヘルパー: END_TURN 時の保険処理 ──
// 1. 10ターン節目なら加入中物件の保険料を徴収
// 2. 全プレイヤーの物件に対して火災チェック（2%）
// 発火した物件は消滅し、保険あり→評価額返金、なし→スクラップ分返金
function applyInsuranceOnEndTurn(
  state: GameState,
  newTurnCount: number,
): GameState {
  let players = [...state.players];
  let propertyStates = { ...state.propertyStates };
  let insuranceState = { ...(state.insuranceState ?? {}) };
  const messages: string[] = [];

  // 保険料徴収（10ターン節目のみ）
  if (shouldCollectPremium(newTurnCount)) {
    players = players.map((p) => {
      if (p.isBankrupt) return p;
      let totalPremium = 0;
      for (const propId of p.properties) {
        if (!isPropertyInsured(insuranceState, propId)) continue;
        const space = getSpaceById(propId, state.board);
        totalPremium += calculatePremium(space?.price ?? 0);
      }
      if (totalPremium === 0) return p;
      messages.push(`${p.name}の保険料$${totalPremium}を徴収したよ`);
      return { ...p, money: p.money - totalPremium };
    });
  }

  // 火災チェック（毎ターン、全プレイヤーの全物件）
  // 確認用に FIRE_PROBABILITY を参照（定数として使用）
  void FIRE_PROBABILITY;
  const fireMessages: string[] = [];
  const updatedPlayers = players.map((p) => {
    if (p.isBankrupt) return p;
    let moneyDelta = 0;
    const destroyedProps: string[] = [];
    for (const propId of p.properties) {
      const space = getSpaceById(propId, state.board);
      // 不動産（property）のみ火災対象
      if (!space || space.type !== 'property') continue;
      const roll = getSecureRandomInt(1, 100);
      if (roll > FIRE_PROBABILITY * 100) continue;
      // 火災発生
      const insured = isPropertyInsured(insuranceState, propId);
      const payout = calculateFirePayout(space.price ?? 0, insured);
      moneyDelta += payout;
      destroyedProps.push(propId);
      propertyStates = {
        ...propertyStates,
        [propId]: { ownerId: null, houses: 0, isMortgaged: false },
      };
      // 保険加入状態から除去
      delete insuranceState[propId];
      fireMessages.push(
        insured
          ? `🔥 ${p.name}の${space.name}で火災！保険で$${payout}補填されたよ`
          : `🔥 ${p.name}の${space.name}で火災！保険なしでスクラップ$${payout}だよ…`,
      );
    }
    if (destroyedProps.length === 0) return p;
    return {
      ...p,
      money: p.money + moneyDelta,
      properties: p.properties.filter((id) => !destroyedProps.includes(id)),
    };
  });

  const allMessages = [...messages, ...fireMessages];
  return {
    ...state,
    players: updatedPlayers,
    propertyStates,
    insuranceState,
    message: allMessages.length > 0 ? allMessages.join(' / ') : state.message,
  };
}

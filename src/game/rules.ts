import type {
  BoardSpace,
  GameState,
  Player,
  PropertyState,
  TradeOffer,
  TradeValidationResult,
} from './types';

// ⚡ Bolt: Cache board lookups to prevent O(N) array scans during frequent operations
type BoardCache = {
  byId: Map<string, BoardSpace>;
  byColor: Map<string, string[]>;
  byType: Map<string, string[]>;
};
const boardCacheMap = new WeakMap<BoardSpace[], BoardCache>();

function getBoardCache(board: BoardSpace[]): BoardCache {
  let cache = boardCacheMap.get(board);
  if (!cache) {
    const byId = new Map<string, BoardSpace>();
    const byColor = new Map<string, string[]>();
    const byType = new Map<string, string[]>();

    for (const space of board) {
      byId.set(space.id, space);
      if (space.color) {
        if (!byColor.has(space.color)) byColor.set(space.color, []);
        byColor.get(space.color)!.push(space.id);
      }
      if (!byType.has(space.type)) byType.set(space.type, []);
      byType.get(space.type)!.push(space.id);
    }
    cache = { byId, byColor, byType };
    boardCacheMap.set(board, cache);
  }
  return cache;
}

export function getSpaceById(
  propertyId: string,
  board: BoardSpace[],
): BoardSpace | undefined {
  return getBoardCache(board).byId.get(propertyId);
}

const EMPTY_COLOR_GROUP: readonly string[] = [];

// ⚡ Bolt: Returns a readonly reference to the cached array (no allocation).
// Callers must not mutate the result.
export function getColorGroup(
  propertyId: string,
  board: BoardSpace[],
): readonly string[] {
  const cache = getBoardCache(board);
  const space = cache.byId.get(propertyId);
  if (!space?.color) return EMPTY_COLOR_GROUP;
  return cache.byColor.get(space.color) ?? EMPTY_COLOR_GROUP;
}

/**
 * 指定されたプレイヤーがカラーグループ全体を所有しているかを判定します。
 * @param propertyId - チェック対象の物件ID
 * @param ownerId - 所有者のプレイヤーID
 * @param propertyStates - 物件の状態レコード
 * @param board - ボードスペースの配列
 * @returns カラーグループ全体を所有している場合は true
 */
export function ownsFullColorGroup(
  propertyId: string,
  ownerId: string,
  propertyStates: Record<string, PropertyState>,
  board: BoardSpace[],
): boolean {
  const group = getColorGroup(propertyId, board);
  if (group.length === 0) return false;
  for (const id of group) {
    if (propertyStates[id]?.ownerId !== ownerId) return false;
  }
  return true;
}

export function calculateRent(
  propertyId: string,
  propertyStates: Record<string, PropertyState>,
  board: BoardSpace[],
  diceValues: [number, number],
): number {
  const state = propertyStates[propertyId];
  if (!state?.ownerId || state.isMortgaged) return 0;
  const cache = getBoardCache(board);
  const space = cache.byId.get(propertyId)!;
  if (space.type === 'railroad') {
    const railroadIds = cache.byType.get('railroad') ?? [];
    let ownedRailroads = 0;
    for (const id of railroadIds) {
      const pState = propertyStates[id];
      if (pState?.ownerId === state.ownerId && !pState?.isMortgaged) {
        ownedRailroads++;
      }
    }
    return space.rent![ownedRailroads - 1];
  }
  if (space.type === 'utility') {
    const utilityIds = cache.byType.get('utility') ?? [];
    let ownedUtilities = 0;
    for (const id of utilityIds) {
      const pState = propertyStates[id];
      if (pState?.ownerId === state.ownerId && !pState?.isMortgaged) {
        ownedUtilities++;
      }
    }
    const diceTotal = diceValues[0] + diceValues[1];
    return diceTotal * (ownedUtilities === 1 ? 4 : 10);
  }
  if (state.houses > 0) return space.rent![state.houses];
  const baseRent = space.rent![0];
  if (ownsFullColorGroup(propertyId, state.ownerId, propertyStates, board))
    return baseRent * 2;
  return baseRent;
}

export function canBuildHouse(
  propertyId: string,
  playerId: string,
  propertyStates: Record<string, PropertyState>,
  board: BoardSpace[],
): boolean {
  const state = propertyStates[propertyId];
  if (!state || state.ownerId !== playerId) return false;
  if (state.houses >= 5) return false;
  if (state.isMortgaged) return false;

  const group = getColorGroup(propertyId, board);
  if (group.length === 0) return false;

  let minHouses = Infinity;
  for (const id of group) {
    const pState = propertyStates[id];
    // Must own full color group
    if (pState?.ownerId !== playerId) return false;
    // No property in the group can be mortgaged
    if (pState?.isMortgaged) return false;
    const h = pState?.houses ?? 0;
    if (h < minHouses) minHouses = h;
  }

  return state.houses <= minHouses;
}

/**
 * 指定された物件を抵当に入れることができるかを判定します。
 * カラーグループ内のいずれかの物件に家が建っている場合は抵当に入れられません。
 * @param propertyId - チェック対象の物件ID
 * @param playerId - プレイヤーID
 * @param propertyStates - 物件の状態レコード
 * @param board - ボードスペースの配列
 * @returns 抵当に入れられる場合は true
 */
export function canMortgage(
  propertyId: string,
  playerId: string,
  propertyStates: Record<string, PropertyState>,
  board: BoardSpace[],
): boolean {
  const state = propertyStates[propertyId];
  if (!state || state.ownerId !== playerId) return false;
  if (state.isMortgaged) return false;
  const group = getColorGroup(propertyId, board);
  for (const id of group) {
    if ((propertyStates[id]?.houses ?? 0) > 0) return false;
  }
  return true;
}

export function canUnmortgage(
  propertyId: string,
  playerId: string,
  player: Player,
  propertyStates: Record<string, PropertyState>,
  board: BoardSpace[],
): boolean {
  const state = propertyStates[propertyId];
  if (!state || state.ownerId !== playerId) return false;
  if (!state.isMortgaged) return false;
  const space = getSpaceById(propertyId, board)!;
  const unmortgageCost = Math.floor((space.mortgageValue ?? 0) * 1.1);
  return player.money >= unmortgageCost;
}

export function findNearestSpace(
  currentPosition: number,
  spaceType: 'railroad' | 'utility',
  board: BoardSpace[],
): number {
  const cache = getBoardCache(board);
  const targetIds = cache.byType.get(spaceType) || [];
  for (const id of targetIds) {
    const target = cache.byId.get(id);
    if (target && target.position > currentPosition) return target.position;
  }
  const firstId = targetIds[0];
  if (firstId === undefined) return currentPosition;
  const firstTarget = cache.byId.get(firstId);
  return firstTarget ? firstTarget.position : currentPosition;
}

export function calculateTotalAssets(
  player: Player,
  propertyStates: Record<string, PropertyState>,
  board: BoardSpace[],
): number {
  let total = player.money;
  const cache = getBoardCache(board);
  for (const propId of player.properties) {
    const state = propertyStates[propId];
    const space = cache.byId.get(propId)!;
    if (!state?.isMortgaged) total += space.mortgageValue ?? 0;
    if (state && state.houses > 0)
      total += Math.floor(((space.houseCost ?? 0) * state.houses) / 2);
  }
  return total;
}

/**
 * 取引オファーの妥当性を検証します。
 * プレイヤーの存在、資金、物件所有、家の有無などをチェックします。
 * オファーまたはリクエスト物件のカラーグループ内に家が建っている場合は取引不可となります。
 * @param state - 現在のゲーム状態
 * @param offer - 検証する取引オファー
 * @returns 検証結果（isValid と任意の reason を含むオブジェクト）
 */
export function validateTradeOffer(
  state: GameState,
  offer: TradeOffer,
): TradeValidationResult {
  const fromPlayer = state.players.find((p) => p.id === offer.fromPlayerId);
  const toPlayer = state.players.find((p) => p.id === offer.toPlayerId);
  if (!fromPlayer || !toPlayer) {
    return { isValid: false, reason: 'PLAYER_NOT_FOUND' };
  }
  if (fromPlayer.isBankrupt || toPlayer.isBankrupt) {
    return { isValid: false, reason: 'PLAYER_BANKRUPT' };
  }

  if (
    !Number.isInteger(offer.offerMoney) ||
    !Number.isInteger(offer.requestMoney) ||
    !Number.isInteger(offer.offerJailCards) ||
    !Number.isInteger(offer.requestJailCards)
  ) {
    return { isValid: false, reason: 'NOT_INTEGER' };
  }
  if (
    offer.offerMoney < 0 ||
    offer.requestMoney < 0 ||
    offer.offerJailCards < 0 ||
    offer.requestJailCards < 0
  ) {
    return { isValid: false, reason: 'NEGATIVE_VALUE' };
  }

  if (
    offer.offerMoney > fromPlayer.money ||
    offer.requestMoney > toPlayer.money
  ) {
    return { isValid: false, reason: 'INSUFFICIENT_FUNDS' };
  }
  if (
    offer.offerJailCards > fromPlayer.getOutOfJailCards ||
    offer.requestJailCards > toPlayer.getOutOfJailCards
  ) {
    return { isValid: false, reason: 'INSUFFICIENT_JAIL_CARDS' };
  }

  for (const id of offer.offerProperties) {
    if (!fromPlayer.properties.includes(id)) {
      return { isValid: false, reason: 'NOT_PROPERTY_OWNER' };
    }
  }
  for (const id of offer.requestProperties) {
    if (!toPlayer.properties.includes(id)) {
      return { isValid: false, reason: 'NOT_PROPERTY_OWNER' };
    }
  }

  let propertyHasHouses = false;
  for (const id of offer.offerProperties) {
    const group = getColorGroup(id, state.board);
    for (const gid of group) {
      if ((state.propertyStates[gid]?.houses ?? 0) > 0) {
        propertyHasHouses = true;
        break;
      }
    }
    if (propertyHasHouses) break;
  }
  if (!propertyHasHouses) {
    for (const id of offer.requestProperties) {
      const group = getColorGroup(id, state.board);
      for (const gid of group) {
        if ((state.propertyStates[gid]?.houses ?? 0) > 0) {
          propertyHasHouses = true;
          break;
        }
      }
      if (propertyHasHouses) break;
    }
  }
  if (propertyHasHouses) {
    return { isValid: false, reason: 'PROPERTY_HAS_HOUSES' };
  }

  return { isValid: true };
}

export function canSellHouse(
  propertyId: string,
  playerId: string,
  propertyStates: Record<string, PropertyState>,
  board: BoardSpace[],
): boolean {
  const state = propertyStates[propertyId];
  if (!state || state.ownerId !== playerId) return false;
  if (state.houses <= 0) return false;

  const group = getColorGroup(propertyId, board);
  let maxHouses = 0;
  for (const id of group) {
    const h = propertyStates[id]?.houses ?? 0;
    if (h > maxHouses) maxHouses = h;
  }

  return state.houses >= maxHouses;
}

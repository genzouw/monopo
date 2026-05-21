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

export function getColorGroup(
  propertyId: string,
  board: BoardSpace[],
): string[] {
  const cache = getBoardCache(board);
  const space = cache.byId.get(propertyId);
  if (!space?.color) return [];
  const ids = cache.byColor.get(space.color);
  return ids ? [...ids] : [];
}

export function ownsFullColorGroup(
  propertyId: string,
  ownerId: string,
  propertyStates: Record<string, PropertyState>,
  board: BoardSpace[],
): boolean {
  const group = getColorGroup(propertyId, board);
  if (group.length === 0) return false;
  return group.every((id) => propertyStates[id]?.ownerId === ownerId);
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
    const ownedRailroads = railroadIds.filter(
      (id) =>
        propertyStates[id]?.ownerId === state.ownerId &&
        !propertyStates[id]?.isMortgaged,
    ).length;
    return space.rent![ownedRailroads - 1];
  }
  if (space.type === 'utility') {
    const utilityIds = cache.byType.get('utility') ?? [];
    const ownedUtilities = utilityIds.filter(
      (id) =>
        propertyStates[id]?.ownerId === state.ownerId &&
        !propertyStates[id]?.isMortgaged,
    ).length;
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
  if (!ownsFullColorGroup(propertyId, playerId, propertyStates, board))
    return false;
  const group = getColorGroup(propertyId, board);
  if (group.some((id) => propertyStates[id]?.isMortgaged)) return false;
  const currentHouses = state.houses;
  const minHouses = Math.min(
    ...group.map((id) => propertyStates[id]?.houses ?? 0),
  );
  return currentHouses <= minHouses;
}

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
  if (group.some((id) => (propertyStates[id]?.houses ?? 0) > 0)) return false;
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
  const targets = board.filter((s) => s.type === spaceType);
  for (const target of targets) {
    if (target.position > currentPosition) return target.position;
  }
  return targets[0].position;
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

  const numericFields = [
    offer.offerMoney,
    offer.requestMoney,
    offer.offerJailCards,
    offer.requestJailCards,
  ];
  if (numericFields.some((n) => !Number.isInteger(n))) {
    return { isValid: false, reason: 'NOT_INTEGER' };
  }
  if (numericFields.some((n) => n < 0)) {
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

  if (
    !offer.offerProperties.every((id) => fromPlayer.properties.includes(id))
  ) {
    return { isValid: false, reason: 'NOT_PROPERTY_OWNER' };
  }
  if (
    !offer.requestProperties.every((id) => toPlayer.properties.includes(id))
  ) {
    return { isValid: false, reason: 'NOT_PROPERTY_OWNER' };
  }

  const tradedProperties = [
    ...offer.offerProperties,
    ...offer.requestProperties,
  ];
  if (
    tradedProperties.some((id) => {
      const group = getColorGroup(id, state.board);
      return group.some((gid) => (state.propertyStates[gid]?.houses ?? 0) > 0);
    })
  ) {
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
  const currentHouses = state.houses;
  const maxHouses = Math.max(
    ...group.map((id) => propertyStates[id]?.houses ?? 0),
  );
  return currentHouses >= maxHouses;
}

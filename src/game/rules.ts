import type { BoardSpace, Player, PropertyState } from './types';

export function getColorGroup(
  propertyId: string,
  board: BoardSpace[],
): string[] {
  const space = board.find((s) => s.id === propertyId);
  if (!space?.color) return [];
  return board.filter((s) => s.color === space.color).map((s) => s.id);
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
  const space = board.find((s) => s.id === propertyId)!;
  if (space.type === 'railroad') {
    const ownedRailroads = board
      .filter((s) => s.type === 'railroad')
      .filter(
        (s) =>
          propertyStates[s.id]?.ownerId === state.ownerId &&
          !propertyStates[s.id]?.isMortgaged,
      ).length;
    return space.rent![ownedRailroads - 1];
  }
  if (space.type === 'utility') {
    const ownedUtilities = board
      .filter((s) => s.type === 'utility')
      .filter(
        (s) =>
          propertyStates[s.id]?.ownerId === state.ownerId &&
          !propertyStates[s.id]?.isMortgaged,
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
  const space = board.find((s) => s.id === propertyId)!;
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
  for (const propId of player.properties) {
    const state = propertyStates[propId];
    const space = board.find((s) => s.id === propId)!;
    if (!state?.isMortgaged) total += space.mortgageValue ?? 0;
    if (state && state.houses > 0)
      total += Math.floor(((space.houseCost ?? 0) * state.houses) / 2);
  }
  return total;
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

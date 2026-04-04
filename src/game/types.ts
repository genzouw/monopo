// ── プレイヤートークン ──
export const TOKENS = ['🚗', '🎩', '👞', '🐕', '🚀', '🌟'] as const;

// ── 物件カラーグループ ──
export type ColorGroup =
  | 'brown'
  | 'lightblue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'blue';

// ── ボードマスの種別 ──
export type SpaceType =
  | 'property'
  | 'railroad'
  | 'utility'
  | 'tax'
  | 'chance'
  | 'communityChest'
  | 'corner';

// ── ボードマス ──
export type BoardSpace = {
  id: string;
  position: number;
  type: SpaceType;
  name: string;
  color?: ColorGroup;
  price?: number;
  rent?: number[];
  houseCost?: number;
  mortgageValue?: number;
};

// ── プレイヤー ──
export type Player = {
  id: string;
  name: string;
  token: string;
  money: number;
  position: number;
  properties: string[];
  inJail: boolean;
  jailTurns: number;
  getOutOfJailCards: number;
  isBankrupt: boolean;
};

// ── カード ──
export type CardAction =
  | { type: 'move'; position: number }
  | { type: 'moveRelative'; spaces: number }
  | { type: 'money'; amount: number }
  | { type: 'moneyFromPlayers'; amount: number }
  | { type: 'jail' }
  | { type: 'jailFree' }
  | { type: 'repair'; perHouse: number; perHotel: number }
  | { type: 'moveNearest'; spaceType: 'railroad' | 'utility' };

export type Card = {
  id: string;
  type: 'chance' | 'communityChest';
  text: string;
  action: CardAction;
};

// ── 物件の所有状態 ──
export type PropertyState = {
  ownerId: string | null;
  houses: number; // 0-4, 5=ホテル
  isMortgaged: boolean;
};

// ── 競売状態 ──
export type AuctionState = {
  propertyId: string;
  currentBid: number;
  currentBidderId: string | null;
  passedPlayerIds: string[];
  activePlayerIndex: number;
  sellerId: string | null; // 売却オークションの場合、売り手のID
};

// ── 取引状態 ──
export type TradeOffer = {
  fromPlayerId: string;
  toPlayerId: string;
  offerProperties: string[];
  offerMoney: number;
  offerJailCards: number;
  requestProperties: string[];
  requestMoney: number;
  requestJailCards: number;
};

// ── ターンフェーズ ──
export type TurnPhase =
  | 'roll'
  | 'moving'
  | 'landed'
  | 'action'
  | 'auction'
  | 'trade'
  | 'tradeConfirm'
  | 'build'
  | 'sell'
  | 'bankrupt'
  | 'endTurn';

// ── ゲーム状態 ──
export type GameState = {
  phase: 'setup' | 'playing' | 'finished';
  players: Player[];
  currentPlayerIndex: number;
  board: BoardSpace[];
  propertyStates: Record<string, PropertyState>;
  cards: { chance: Card[]; communityChest: Card[] };
  dice: { values: [number, number]; doubles: number; rolled: boolean };
  turnPhase: TurnPhase;
  auction: AuctionState | null;
  trade: TradeOffer | null;
  currentCard: Card | null;
  message: string;
  winnerId: string | null;
};

// ── ファクトリ関数 ──
export function createInitialPlayer(
  id: string,
  name: string,
  token: string,
): Player {
  return {
    id,
    name,
    token,
    money: 1500,
    position: 0,
    properties: [],
    inJail: false,
    jailTurns: 0,
    getOutOfJailCards: 0,
    isBankrupt: false,
  };
}

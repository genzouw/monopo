// ── プレイヤートークン ──
export const TOKENS = ['🚗', '🎩', '👞', '🐕', '🚀', '🌟'] as const;

// ── プレイヤー数の範囲 ──
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;

// ── プレイヤー名の最大文字数（コードポイント基準） ──
export const MAX_NAME_LENGTH = 20;

// ── 物件カラーグループ ──
export type ColorGroup =
  | 'brown'
  | 'lightblue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'railroad';

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
  // P1 拡張: 持株（color → 持株数）。featureFlags.stocks が無効のときは undefined
  stocks?: Partial<Record<ColorGroup, number>>;
};

// ── P2-a 拡張: 景気ステータス ──
export type EconomyStatus = 'boom' | 'normal' | 'recession' | 'crisis';

// ── P1 拡張: 機能フラグ（OFF時は既存挙動完全互換） ──
export type FeatureFlags = {
  stocks?: boolean; // エリア株売買・配当（応援カード）。
  // 株価は需要供給モデル（売買で動的変動）＋家・ホテル建設で連動上昇。
  insurance?: boolean; // P2-c 拡張: 不動産保険（火災リスク・保険料・補填）
  macroEconomy?: boolean; // Phase 2-a: マクロ経済サイクル（好況・通常・不況・金融危機の4状態を遷移）
};

// ── P1 拡張: エリア株（カラーグループ株） ──
// 株価・発行株数・銀行保有株を管理。プレイヤー保有株は Player.stocks 側に持つ。
export type ColorGroupStock = {
  color: ColorGroup;
  pricePerShare: number;
  totalShares: number; // 発行株数（固定）
  bankShares: number; // 銀行に残っている株（売れ残り）
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
  poisonPillActive?: boolean;
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

// ── 取引検証結果 ──
export type TradeInvalidReason =
  | 'PLAYER_NOT_FOUND'
  | 'PLAYER_BANKRUPT'
  | 'NOT_INTEGER'
  | 'NEGATIVE_VALUE'
  | 'INSUFFICIENT_FUNDS'
  | 'INSUFFICIENT_JAIL_CARDS'
  | 'NOT_PROPERTY_OWNER'
  | 'PROPERTY_HAS_HOUSES';

export type TradeValidationResult =
  | { isValid: true }
  | { isValid: false; reason: TradeInvalidReason };

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
  | 'stock' // P1 拡張: 株式売買フェーズ（roll/endTurn からサブアクションで開始）
  | 'forceBuy'
  | 'forceSell'
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
  // P1 拡張: 機能フラグ（未定義時は既存挙動）
  features?: FeatureFlags;
  // P1 拡張: 株式市場（features.stocks が有効なときのみ意味を持つ）
  stockMarket?: Partial<Record<ColorGroup, ColorGroupStock>>;
  // P2-c 拡張: 保険加入状態（propertyId → 加入中か）。features.insurance が有効なときのみ意味を持つ
  insuranceState?: Record<string, boolean>;
  // P2-a/P2-c 拡張: ゲーム開始からの累積ターン数
  turnCount?: number;
  // P2-a 拡張: 景気ステータス（features.macroEconomy が有効なときのみ意味を持つ）
  economyStatus?: EconomyStatus;
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

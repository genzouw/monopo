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
  // P3 拡張: 新アセットクラス（features.altAssets が有効なときのみ意味を持つ）
  cryptoHolding?: CryptoHolding;
  vcInvestments?: VCInvestment[];
  esgHoldings?: ESGHolding[];
  // P3-a 拡張: ローン（features.loan が有効なときのみ意味を持つ）
  loan?: LoanState;
};

// ── P1 拡張: 機能フラグ（OFF時は既存挙動完全互換） ──
export type FeatureFlags = {
  stocks?: boolean; // エリア株売買・配当（応援カード）。
  // 株価は需要供給モデル（売買で動的変動）＋家・ホテル建設で連動上昇。
  altAssets?: boolean; // P3 拡張: 新アセットクラス（暗号資産・VC・ESG）。
  loan?: boolean; // P3-a 拡張: 変動金利ローン・クレジットスコア。
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

// ── P3-a 拡張: ローン状態 ──
export type LoanState = {
  principal: number; // 残元本
  annualRate: number; // 現在の年利（小数）
  monthlyPayment: number; // 毎ターン返済額（元利均等）
  remainingPayments: number; // 残返済回数
};

// ── P3 拡張: 新アセットクラス ──

export type CryptoHolding = {
  units: number; // 保有ユニット数
  initialPrice: number; // 購入時の基準価格（クランプ計算用）
  currentPrice: number; // 現在の市場価格（毎ターン更新）
};

export type VCInvestment = {
  amount: number; // 投資額
  investedTurn: number; // 投資したグローバルターン番号
};

export type ESGHolding = {
  amount: number; // 投資額（配当計算の基準）
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
  | 'stock' // P1 拡張: 株式売買フェーズ（roll/endTurn からサブアクションで開始）
  | 'altAsset' // P3 拡張: 新アセットクラス操作フェーズ
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
  // P3 拡張: グローバルターンカウンター（END_TURN ごとに +1）
  turnCount?: number;
  // P3-a 拡張: 基準金利（features.loan が有効なときのみ意味を持つ）
  baseRate?: number;
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

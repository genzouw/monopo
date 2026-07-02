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
  // 信用スコア拡張: 0-850。features.creditScore が有効なときのみ意味を持つ
  creditScore?: number;
  // ローン拡張: ローン残高。features.loan が有効なときのみ意味を持つ
  loanBalance?: number;
  // ローン拡張: 借入時の金利タイプ（'fixed' = 固定, 'variable' = 変動）
  loanType?: 'fixed' | 'variable';
  // 累進課税拡張: 次のGO通過時に控除される寄付累積額。features.progressiveTax が有効なときのみ意味を持つ
  pendingDonation?: number;
};

// ── P2-a 拡張: 景気ステータス ──
export type EconomyStatus = 'boom' | 'normal' | 'recession' | 'crisis';

// ── P1 拡張: 機能フラグ（OFF時は既存挙動完全互換） ──
export type FeatureFlags = {
  stocks?: boolean; // エリア株売買・配当（応援カード）。
  // 株価は需要供給モデル（売買で動的変動）＋家・ホテル建設で連動上昇。
  altAssets?: boolean; // P3 拡張: 新アセットクラス（暗号資産・VC・ESG）。
  insurance?: boolean; // P2-c 拡張: 不動産保険（火災リスク・保険料・補填）
  macroEconomy?: boolean; // Phase 2-a: マクロ経済サイクル（好況・通常・不況・金融危機の4状態を遷移）
  creditScore?: boolean; // 信用スコア（借入金利優遇・物件購入制限）
  loan?: boolean; // 変動/固定金利ローン（銀行借入・景気連動金利・GOマス利息引落）
  progressiveTax?: boolean; // 累進課税・公共基金・再分配・節税アクション（寄付控除）
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
  | { type: 'moveNearest'; spaceType: 'railroad' | 'utility' }
  | { type: 'blackSwanDisaster'; colorGroup: ColorGroup };

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
  isInsured?: boolean; // Phase 3 拡張: 損害保険（掛け捨て・1ラウンド有効）
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
  { isValid: true } | { isValid: false; reason: TradeInvalidReason };

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
  investedTurn: number; // 投資したグローバルターン番号
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
  // P2-c 拡張: 保険加入状態（propertyId → 加入中か）。features.insurance が有効なときのみ意味を持つ
  insuranceState?: Record<string, boolean>;
  // ターン数（景気更新周期・VCインベストメント成熟・ESG配当判定に使用）
  turnCount?: number;
  // P2-a 拡張: 景気ステータス（features.macroEconomy が有効なときのみ意味を持つ）
  economyStatus?: EconomyStatus;
  // 累進課税拡張: 累進課税で徴収した税を蓄積する公共基金（features.progressiveTax が有効なときのみ意味を持つ）
  publicFund?: number;
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

import * as v from 'valibot';
import type { BehavioralBiasState } from './systems/behavioralBias';

/**
 * ゲーム状態・セットアップ設定のスキーマ。
 * `types.ts` の型はここから `v.InferOutput` で導出する。フィールドを足すときはスキーマだけを
 * 変えればよく、保存データの検証の追加漏れが起きない。
 */

// ── プレイヤートークン・人数・名前の定数（types.ts が再 export する）──
export const TOKENS = ['🚗', '🎩', '👞', '🐕', '🚀', '🌟'] as const;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
// プレイヤー名の最大文字数（コードポイント基準）
export const MAX_NAME_LENGTH = 20;
// 名前バリデーション: サロゲートペア分解前のコードユニット長の上限係数（DoS 安全マージン）
export const RAW_LENGTH_LIMIT_MULTIPLIER = 10;

/** 制御文字（U+0000-001F, U+007F）を含まないこと。 */
// eslint-disable-next-line no-control-regex
const NO_CONTROL_CHARS = /^[^\x00-\x1F\x7F]*$/;

const ColorGroupSchema = v.picklist([
  'brown',
  'lightblue',
  'pink',
  'orange',
  'red',
  'yellow',
  'green',
  'blue',
  'railroad',
]);

const SpaceTypeSchema = v.picklist([
  'property',
  'railroad',
  'utility',
  'tax',
  'chance',
  'communityChest',
  'corner',
]);

const BoardSpaceSchema = v.object({
  id: v.string(),
  position: v.number(),
  type: SpaceTypeSchema,
  name: v.string(),
  color: v.optional(ColorGroupSchema),
  price: v.optional(v.number()),
  rent: v.optional(v.array(v.number())),
  houseCost: v.optional(v.number()),
  mortgageValue: v.optional(v.number()),
});

const CryptoHoldingSchema = v.object({
  units: v.number(), // 保有ユニット数
  initialPrice: v.number(), // 購入時の基準価格（クランプ計算用）
  currentPrice: v.number(), // 現在の市場価格（毎ターン更新）
});

const VCInvestmentSchema = v.object({
  amount: v.number(), // 投資額
  investedTurn: v.number(), // 投資したグローバルターン番号
});

const ESGHoldingSchema = v.object({
  amount: v.number(), // 投資額（配当計算の基準）
  investedTurn: v.number(), // 投資したグローバルターン番号
});

const PlayerSchema = v.object({
  id: v.string(),
  name: v.pipe(v.string(), v.regex(NO_CONTROL_CHARS)),
  token: v.string(),
  money: v.number(),
  position: v.number(),
  properties: v.array(v.string()),
  inJail: v.boolean(),
  jailTurns: v.number(),
  getOutOfJailCards: v.number(),
  isBankrupt: v.boolean(),
  // P1 拡張: 持株（color → 持株数）。featureFlags.stocks が無効のときは undefined
  stocks: v.optional(v.record(ColorGroupSchema, v.number())),
  // P3 拡張: 新アセットクラス（features.altAssets が有効なときのみ意味を持つ）
  cryptoHolding: v.optional(CryptoHoldingSchema),
  vcInvestments: v.optional(v.array(VCInvestmentSchema)),
  esgHoldings: v.optional(v.array(ESGHoldingSchema)),
  // 信用スコア拡張: 0-850。features.creditScore が有効なときのみ意味を持つ
  creditScore: v.optional(v.number()),
  // ローン拡張: ローン残高。features.loan が有効なときのみ意味を持つ
  loanBalance: v.optional(v.number()),
  // ローン拡張: 借入時の金利タイプ（'fixed' = 固定, 'variable' = 変動）
  loanType: v.optional(v.picklist(['fixed', 'variable'])),
  // 累進課税拡張: 次の GO 通過時に控除される寄付累積額。features.progressiveTax が有効なときのみ意味を持つ
  pendingDonation: v.optional(v.number()),
});

// P2-a 拡張: 景気ステータス
const EconomyStatusSchema = v.picklist([
  'boom',
  'normal',
  'recession',
  'crisis',
]);

// P1 拡張: 機能フラグ（OFF 時は既存挙動完全互換）
// 非 boolean の値はそのフラグだけを捨てる（OFF 扱い）。保存データ全体は拒否しない
const flag = v.fallback(v.optional(v.boolean()), undefined);
const FeatureFlagsSchema = v.object({
  stocks: flag, // エリア株売買・配当（応援カード）
  altAssets: flag, // P3 拡張: 新アセットクラス（暗号資産・VC・ESG）
  insurance: flag, // P2-c 拡張: 不動産保険（火災リスク・保険料・補填）
  macroEconomy: flag, // Phase 2-a: マクロ経済サイクル
  creditScore: flag, // 信用スコア（借入金利優遇・物件購入制限）
  loan: flag, // 変動/固定金利ローン
  progressiveTax: flag, // 累進課税・公共基金・再分配・節税アクション
  behavioralBias: flag, // 行動経済学バイアス。stocks が ON のときだけ作動する
});

// P1 拡張: エリア株（カラーグループ株）。プレイヤー保有株は Player.stocks 側に持つ。
const ColorGroupStockSchema = v.object({
  color: ColorGroupSchema,
  pricePerShare: v.number(),
  totalShares: v.number(), // 発行株数（固定）
  bankShares: v.number(), // 銀行に残っている株（売れ残り）
});

const CardActionSchema = v.variant('type', [
  v.object({ type: v.literal('move'), position: v.number() }),
  v.object({ type: v.literal('moveRelative'), spaces: v.number() }),
  v.object({ type: v.literal('money'), amount: v.number() }),
  v.object({ type: v.literal('moneyFromPlayers'), amount: v.number() }),
  v.object({ type: v.literal('jail') }),
  v.object({ type: v.literal('jailFree') }),
  v.object({
    type: v.literal('repair'),
    perHouse: v.number(),
    perHotel: v.number(),
  }),
  v.object({
    type: v.literal('moveNearest'),
    spaceType: v.picklist(['railroad', 'utility']),
  }),
  v.object({
    type: v.literal('blackSwanDisaster'),
    colorGroup: ColorGroupSchema,
  }),
]);

const CardSchema = v.object({
  id: v.string(),
  type: v.picklist(['chance', 'communityChest']),
  text: v.string(),
  action: CardActionSchema,
});

const PropertyStateSchema = v.object({
  ownerId: v.nullable(v.string()),
  houses: v.number(), // 0-4, 5=ホテル
  isMortgaged: v.boolean(),
  isInsured: v.optional(v.boolean()), // Phase 3 拡張: 損害保険（掛け捨て・1ラウンド有効）
  poisonPillActive: v.optional(v.boolean()),
});

const AuctionStateSchema = v.object({
  propertyId: v.string(),
  currentBid: v.number(),
  currentBidderId: v.nullable(v.string()),
  passedPlayerIds: v.array(v.string()),
  activePlayerIndex: v.number(),
  sellerId: v.nullable(v.string()), // 売却オークションの場合、売り手の ID
});

const TradeOfferSchema = v.object({
  fromPlayerId: v.string(),
  toPlayerId: v.string(),
  offerProperties: v.array(v.string()),
  offerMoney: v.number(),
  offerJailCards: v.number(),
  requestProperties: v.array(v.string()),
  requestMoney: v.number(),
  requestJailCards: v.number(),
});

const TurnPhaseSchema = v.picklist([
  'roll',
  'moving',
  'landed',
  'action',
  'auction',
  'trade',
  'tradeConfirm',
  'build',
  'sell',
  'stock', // P1 拡張: 株式売買フェーズ
  'altAsset', // P3 拡張: 新アセットクラス操作フェーズ
  'forceBuy',
  'forceSell',
  'bankrupt',
  'endTurn',
]);

/**
 * 行動経済学拡張のバイアス状態は、不正な色・市場だけを捨てる部分救済が要るため、
 * ここでは「オブジェクトであること」だけを確かめる。中身の検証は storage.ts の
 * `sanitizeBiasState` が行う。
 */
const BehavioralBiasStateSchema = v.custom<BehavioralBiasState>(
  (input) =>
    input !== null && typeof input === 'object' && !Array.isArray(input),
);

export const GameStateSchema = v.object({
  phase: v.picklist(['setup', 'playing', 'finished']),
  players: v.array(PlayerSchema),
  currentPlayerIndex: v.number(),
  board: v.array(BoardSpaceSchema),
  propertyStates: v.record(v.string(), PropertyStateSchema),
  cards: v.object({
    chance: v.array(CardSchema),
    communityChest: v.array(CardSchema),
  }),
  dice: v.object({
    values: v.tuple([v.number(), v.number()]),
    doubles: v.number(),
    rolled: v.boolean(),
  }),
  turnPhase: TurnPhaseSchema,
  auction: v.nullable(AuctionStateSchema),
  trade: v.nullable(TradeOfferSchema),
  currentCard: v.nullable(CardSchema),
  message: v.string(),
  winnerId: v.nullable(v.string()),
  // P1 拡張: 機能フラグ（未定義時は既存挙動）
  features: v.optional(FeatureFlagsSchema),
  // P1 拡張: 株式市場（features.stocks が有効なときのみ意味を持つ）
  stockMarket: v.optional(v.record(ColorGroupSchema, ColorGroupStockSchema)),
  // P2-c 拡張: 保険加入状態（propertyId → 加入中か）
  insuranceState: v.optional(v.record(v.string(), v.boolean())),
  // ターン数（景気更新周期・VC 成熟・ESG 配当判定に使用）
  turnCount: v.optional(v.number()),
  // P2-a 拡張: 景気ステータス。未知の値は undefined に落として描画クラッシュを防ぐ
  economyStatus: v.fallback(v.optional(EconomyStatusSchema), undefined),
  // 累進課税拡張: 累進課税で徴収した税を蓄積する公共基金
  publicFund: v.optional(v.number()),
  // 行動経済学拡張: 色ごとのバイアス状態
  behavioralBias: v.optional(BehavioralBiasStateSchema),
});

/** セットアップ設定。名前はコードユニット長・コードポイント長の両方で上限を確かめる。 */
export const SetupConfigSchema = v.object({
  playerCount: v.pipe(
    v.number(),
    v.minValue(MIN_PLAYERS),
    v.maxValue(MAX_PLAYERS),
  ),
  names: v.pipe(
    v.array(
      v.pipe(
        v.string(),
        // サロゲートペア分解による DoS を防ぐため、[...n] 展開前にコードユニット長を絞る
        v.maxLength(MAX_NAME_LENGTH * RAW_LENGTH_LIMIT_MULTIPLIER),
        v.check((n) => [...n].length <= MAX_NAME_LENGTH),
        v.regex(NO_CONTROL_CHARS),
      ),
    ),
    v.length(MAX_PLAYERS),
  ),
  tokens: v.pipe(
    v.array(
      v.pipe(
        v.string(),
        v.check((t) => (TOKENS as readonly string[]).includes(t)),
      ),
    ),
    v.length(MAX_PLAYERS),
  ),
  // P1 拡張: 機能トグル（未指定時は全 OFF＝既存挙動）。不正な features は無視して復元を続ける
  features: v.fallback(v.optional(FeatureFlagsSchema), undefined),
});

export type ColorGroup = v.InferOutput<typeof ColorGroupSchema>;
export type BoardSpace = v.InferOutput<typeof BoardSpaceSchema>;
export type Player = v.InferOutput<typeof PlayerSchema>;
export type EconomyStatus = v.InferOutput<typeof EconomyStatusSchema>;
export type FeatureFlags = v.InferOutput<typeof FeatureFlagsSchema>;
export type ColorGroupStock = v.InferOutput<typeof ColorGroupStockSchema>;
export type CardAction = v.InferOutput<typeof CardActionSchema>;
export type Card = v.InferOutput<typeof CardSchema>;
export type PropertyState = v.InferOutput<typeof PropertyStateSchema>;
export type AuctionState = v.InferOutput<typeof AuctionStateSchema>;
export type TradeOffer = v.InferOutput<typeof TradeOfferSchema>;
export type CryptoHolding = v.InferOutput<typeof CryptoHoldingSchema>;
export type VCInvestment = v.InferOutput<typeof VCInvestmentSchema>;
export type ESGHolding = v.InferOutput<typeof ESGHoldingSchema>;
export type TurnPhase = v.InferOutput<typeof TurnPhaseSchema>;
export type GameState = v.InferOutput<typeof GameStateSchema>;
export type SetupConfig = v.InferOutput<typeof SetupConfigSchema>;

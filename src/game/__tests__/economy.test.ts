import { describe, it, expect } from 'vitest';
import type { ColorGroup, GameState, Player } from '../types';
import { BOARD_SPACES } from '../board';
import {
  SOCIAL_DIVIDEND_OTHERS,
  SOCIAL_DIVIDEND_SELF,
  createInitialGameState,
  gameReducer,
} from '../reducer';
import {
  BASIC_INCOME_BONUS,
  BASIC_INCOME_THRESHOLD,
  BULK_PRICE_MULTIPLIER,
  BULK_PURCHASE_THRESHOLD,
  DIVIDEND_RATE_PCT,
  HOUSE_PRICE_BOOST,
  PRICE_DELTA_PER_SHARE,
  STOCK_INITIAL_PRICE,
  STOCK_MIN_PRICE,
  STOCK_TOTAL_SHARES,
  calculateBasicIncomeBonus,
  calculateDividendPool,
  calculateNextPrice,
  calculateProgressiveTax,
  calculateStockPriceDelta,
  createInitialStockMarket,
  distributeDividends,
  isStocksEnabled,
  validateStockBuy,
  validateStockSell,
} from '../economy';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'テスト',
    token: '🚗',
    money: 1500,
    position: 0,
    properties: [],
    inJail: false,
    jailTurns: 0,
    getOutOfJailCards: 0,
    isBankrupt: false,
    ...overrides,
  };
}

function startGame(features?: { stocks?: boolean }): GameState {
  return gameReducer(createInitialGameState(), {
    type: 'START_GAME',
    playerNames: ['たろう', 'はなこ'],
    playerTokens: ['🚗', '🎩'],
    features,
  });
}

describe('economy.ts 純粋関数', () => {
  describe('createInitialStockMarket', () => {
    it('全カラーグループが STOCK_INITIAL_PRICE で初期化される', () => {
      const market = createInitialStockMarket();
      const groups = Object.keys(market);
      expect(groups.length).toBeGreaterThanOrEqual(8);
      for (const color of groups) {
        const m = market[color as keyof typeof market];
        expect(m.pricePerShare).toBe(STOCK_INITIAL_PRICE);
        expect(m.totalShares).toBe(STOCK_TOTAL_SHARES);
        expect(m.bankShares).toBe(STOCK_TOTAL_SHARES);
      }
    });
  });

  describe('calculateStockPriceDelta', () => {
    it('少量購入（threshold未満）: 線形デルタ', () => {
      expect(calculateStockPriceDelta(3)).toBe(3 * PRICE_DELTA_PER_SHARE);
    });

    it('ちょうどthreshold株: 急騰ボーナス適用', () => {
      expect(calculateStockPriceDelta(BULK_PURCHASE_THRESHOLD)).toBe(
        BULK_PURCHASE_THRESHOLD * PRICE_DELTA_PER_SHARE * BULK_PRICE_MULTIPLIER,
      );
    });

    it('threshold超の大量購入: 急騰ボーナス適用', () => {
      expect(calculateStockPriceDelta(15)).toBe(
        15 * PRICE_DELTA_PER_SHARE * BULK_PRICE_MULTIPLIER,
      );
    });

    it('売却は常に線形（マイナスデルタ）', () => {
      expect(calculateStockPriceDelta(-5)).toBe(-5 * PRICE_DELTA_PER_SHARE);
    });

    it('0株では0を返す', () => {
      expect(calculateStockPriceDelta(0)).toBe(0);
    });
  });

  describe('calculateProgressiveTax', () => {
    it('資産が低いブラケット（3000未満）: 税なし', () => {
      expect(calculateProgressiveTax(150, 1500)).toBe(0);
      expect(calculateProgressiveTax(150, 2999)).toBe(0);
    });

    it('中程度の資産（3000以上6000未満）: 10%課税', () => {
      expect(calculateProgressiveTax(150, 3000)).toBe(Math.floor(150 * 0.1));
      expect(calculateProgressiveTax(150, 5000)).toBe(Math.floor(150 * 0.1));
    });

    it('高資産（6000以上10000未満）: 25%課税', () => {
      expect(calculateProgressiveTax(150, 6000)).toBe(Math.floor(150 * 0.25));
      expect(calculateProgressiveTax(150, 8000)).toBe(Math.floor(150 * 0.25));
    });

    it('超高資産（10000以上）: 40%課税', () => {
      expect(calculateProgressiveTax(150, 10000)).toBe(Math.floor(150 * 0.4));
      expect(calculateProgressiveTax(150, 15000)).toBe(Math.floor(150 * 0.4));
    });

    it('税額は社会配当を超えない（切り捨て）', () => {
      // 150 * 0.4 = 60 → floor(60) = 60
      expect(calculateProgressiveTax(150, 99999)).toBeLessThanOrEqual(150);
    });
  });

  describe('calculateBasicIncomeBonus', () => {
    it('資産が閾値以下: ボーナスあり', () => {
      expect(calculateBasicIncomeBonus(BASIC_INCOME_THRESHOLD)).toBe(
        BASIC_INCOME_BONUS,
      );
      expect(calculateBasicIncomeBonus(0)).toBe(BASIC_INCOME_BONUS);
    });

    it('資産が閾値超: ボーナスなし', () => {
      expect(calculateBasicIncomeBonus(BASIC_INCOME_THRESHOLD + 1)).toBe(0);
      expect(calculateBasicIncomeBonus(9999)).toBe(0);
    });
  });

  describe('calculateNextPrice', () => {
    it('正のデルタで上昇', () => {
      expect(calculateNextPrice(100, 5)).toBe(105);
    });
    it('負のデルタで下降', () => {
      expect(calculateNextPrice(100, -20)).toBe(80);
    });
    it('STOCK_MIN_PRICE 以下にはならない', () => {
      expect(calculateNextPrice(20, -100)).toBe(STOCK_MIN_PRICE);
    });
  });

  describe('calculateDividendPool', () => {
    it('家賃の DIVIDEND_RATE_PCT% を切り捨てで返す', () => {
      expect(calculateDividendPool(100)).toBe(
        Math.floor((100 * DIVIDEND_RATE_PCT) / 100),
      );
      expect(calculateDividendPool(0)).toBe(0);
      expect(calculateDividendPool(-5)).toBe(0);
    });
  });

  describe('distributeDividends', () => {
    it('color が未指定なら空配当', () => {
      const result = distributeDividends(100, undefined, 'owner', 'payer', [
        makePlayer(),
      ]);
      expect(result).toEqual({});
    });

    it('owner と payer は配当対象から除外', () => {
      const players: Player[] = [
        makePlayer({ id: 'owner', stocks: { brown: 50 } }),
        makePlayer({ id: 'payer', stocks: { brown: 50 } }),
      ];
      const result = distributeDividends(
        1000,
        'brown',
        'owner',
        'payer',
        players,
      );
      expect(result).toEqual({});
    });

    it('持株比率に応じて配分（対象内合計を分母にする）', () => {
      const players: Player[] = [
        makePlayer({ id: 'owner' }),
        makePlayer({ id: 'payer' }),
        makePlayer({ id: 'a', stocks: { brown: 30 } }),
        makePlayer({ id: 'b', stocks: { brown: 10 } }),
      ];
      // pool = 1000 * 10% = 100、対象株 = 40、a=75, b=25
      const result = distributeDividends(
        1000,
        'brown',
        'owner',
        'payer',
        players,
      );
      expect(result['a']).toBe(75);
      expect(result['b']).toBe(25);
    });

    it('破産プレイヤーは配当対象外', () => {
      const players: Player[] = [
        makePlayer({ id: 'owner' }),
        makePlayer({ id: 'payer' }),
        makePlayer({
          id: 'a',
          stocks: { brown: 50 },
          isBankrupt: true,
        }),
      ];
      const result = distributeDividends(
        1000,
        'brown',
        'owner',
        'payer',
        players,
      );
      expect(result).toEqual({});
    });
  });

  describe('validateStockBuy', () => {
    it('stocks 機能 OFF なら STOCKS_DISABLED', () => {
      const state = startGame({ stocks: false });
      const result = validateStockBuy(state, 'player-0', 'brown', 1);
      expect(result).toEqual({ ok: false, reason: 'STOCKS_DISABLED' });
    });

    it('shares が 0 以下なら INVALID_SHARES', () => {
      const state = startGame({ stocks: true });
      expect(validateStockBuy(state, 'player-0', 'brown', 0)).toEqual({
        ok: false,
        reason: 'INVALID_SHARES',
      });
    });

    it('資金不足なら INSUFFICIENT_FUNDS', () => {
      const state = startGame({ stocks: true });
      const result = validateStockBuy(state, 'player-0', 'brown', 100);
      expect(result).toEqual({
        ok: false,
        reason: 'INSUFFICIENT_FUNDS',
      });
    });

    it('正常時は cost を返す', () => {
      const state = startGame({ stocks: true });
      const result = validateStockBuy(state, 'player-0', 'brown', 3);
      expect(result).toEqual({ ok: true, cost: 300 });
    });
  });

  describe('validateStockSell', () => {
    it('保有株不足なら INSUFFICIENT_HOLDINGS', () => {
      const state = startGame({ stocks: true });
      const result = validateStockSell(state, 'player-0', 'brown', 1);
      expect(result).toEqual({
        ok: false,
        reason: 'INSUFFICIENT_HOLDINGS',
      });
    });
  });

  describe('featureFlags', () => {
    it('OFF時は isStocksEnabled が false', () => {
      expect(isStocksEnabled(startGame())).toBe(false);
    });

    it('ON時は stockMarket が初期化される', () => {
      const state = startGame({ stocks: true });
      expect(state.stockMarket).toBeDefined();
      expect(isStocksEnabled(state)).toBe(true);
    });

    it('OFF時は stockMarket が undefined（既存挙動互換）', () => {
      expect(startGame().stockMarket).toBeUndefined();
    });
  });
});

describe('reducer P1 拡張', () => {
  describe('BUY_STOCK', () => {
    it('正常な購入で money 減算・stocks 加算・bankShares 減算・株価上昇', () => {
      const state = startGame({ stocks: true });
      const beforePrice = state.stockMarket?.brown?.pricePerShare ?? 0;
      const next = gameReducer(state, {
        type: 'BUY_STOCK',
        color: 'brown',
        shares: 2,
      });
      const buyer = next.players[0];
      expect(buyer.money).toBe(1500 - STOCK_INITIAL_PRICE * 2);
      expect(buyer.stocks?.brown).toBe(2);
      expect(next.stockMarket?.brown?.bankShares).toBe(STOCK_TOTAL_SHARES - 2);
      // 2株は threshold 未満なので線形デルタ
      expect(next.stockMarket?.brown?.pricePerShare).toBe(
        beforePrice + 2 * PRICE_DELTA_PER_SHARE,
      );
    });

    it('大量購入（threshold以上）: 株価が急騰ボーナス込みで上昇', () => {
      // プレイヤーに十分な資金を与える
      let state = startGame({ stocks: true });
      state = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0 ? { ...p, money: 99999 } : p,
        ),
      };
      const beforePrice = state.stockMarket?.brown?.pricePerShare ?? 0;
      const shares = BULK_PURCHASE_THRESHOLD;
      const next = gameReducer(state, {
        type: 'BUY_STOCK',
        color: 'brown',
        shares,
      });
      expect(next.stockMarket?.brown?.pricePerShare).toBe(
        beforePrice + shares * PRICE_DELTA_PER_SHARE * BULK_PRICE_MULTIPLIER,
      );
    });

    it('stocks OFF なら state 不変', () => {
      const state = startGame({ stocks: false });
      const next = gameReducer(state, {
        type: 'BUY_STOCK',
        color: 'brown',
        shares: 1,
      });
      expect(next).toBe(state);
    });
  });

  describe('SELL_STOCK', () => {
    it('購入→売却で 株価が初期値に戻り、保有 0', () => {
      let state = startGame({ stocks: true });
      state = gameReducer(state, {
        type: 'BUY_STOCK',
        color: 'brown',
        shares: 3,
      });
      state = gameReducer(state, {
        type: 'SELL_STOCK',
        color: 'brown',
        shares: 3,
      });
      expect(state.players[0].stocks?.brown).toBeUndefined();
      expect(state.players[0].money).toBe(
        // 買い: 3 * 100 払い、株価 +15 上昇
        // 売り: 3 * 115 受取り（115 = 100 + 3*5）
        1500 - 3 * 100 + 3 * (STOCK_INITIAL_PRICE + 3 * PRICE_DELTA_PER_SHARE),
      );
      expect(state.stockMarket?.brown?.bankShares).toBe(STOCK_TOTAL_SHARES);
      // 株価は買いで +15、売りで -15 戻って初期値
      expect(state.stockMarket?.brown?.pricePerShare).toBe(STOCK_INITIAL_PRICE);
    });
  });

  describe('BUILD_HOUSE による株価ブースト', () => {
    it('stocks ON: 家を建てるとそのエリアの株価が +HOUSE_PRICE_BOOST', () => {
      const targetSpace = BOARD_SPACES.find(
        (s) => s.type === 'property' && s.color === 'brown',
      )!;
      const colorGroup = BOARD_SPACES.filter((s) => s.color === 'brown').map(
        (s) => s.id,
      );
      let state = startGame({ stocks: true });
      const playerId = state.players[0].id;
      // カラーグループ全所有・抵当なしの状態を組み立て
      const propStates = { ...state.propertyStates };
      for (const id of colorGroup) {
        propStates[id] = { ownerId: playerId, houses: 0, isMortgaged: false };
      }
      state = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0 ? { ...p, properties: colorGroup, money: 5000 } : p,
        ),
        propertyStates: propStates,
      };
      const beforePrice = state.stockMarket?.brown?.pricePerShare ?? 0;
      const next = gameReducer(state, {
        type: 'BUILD_HOUSE',
        propertyId: targetSpace.id,
      });
      expect(next.stockMarket?.brown?.pricePerShare).toBe(
        beforePrice + HOUSE_PRICE_BOOST,
      );
    });

    it('stocks OFF: 株価ブーストは発生しない（stockMarket undefined）', () => {
      let state = startGame({ stocks: false });
      const targetSpace = BOARD_SPACES.find(
        (s) => s.type === 'property' && s.color === 'brown',
      )!;
      const colorGroup = BOARD_SPACES.filter((s) => s.color === 'brown').map(
        (s) => s.id,
      );
      const playerId = state.players[0].id;
      const propStates = { ...state.propertyStates };
      for (const id of colorGroup) {
        propStates[id] = { ownerId: playerId, houses: 0, isMortgaged: false };
      }
      state = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0 ? { ...p, properties: colorGroup, money: 5000 } : p,
        ),
        propertyStates: propStates,
      };
      const next = gameReducer(state, {
        type: 'BUILD_HOUSE',
        propertyId: targetSpace.id,
      });
      expect(next.stockMarket).toBeUndefined();
    });
  });

  describe('SELL_HOUSE による株価下降', () => {
    it('stocks ON: 家を売るとそのエリアの株価が -HOUSE_PRICE_BOOST', () => {
      const targetSpace = BOARD_SPACES.find(
        (s) => s.type === 'property' && s.color === 'brown',
      )!;
      const colorGroup = BOARD_SPACES.filter((s) => s.color === 'brown').map(
        (s) => s.id,
      );
      let state = startGame({ stocks: true });
      const playerId = state.players[0].id;
      const propStates = { ...state.propertyStates };
      // 全物件に家1軒
      for (const id of colorGroup) {
        propStates[id] = { ownerId: playerId, houses: 1, isMortgaged: false };
      }
      state = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0 ? { ...p, properties: colorGroup, money: 5000 } : p,
        ),
        propertyStates: propStates,
      };
      const beforePrice = state.stockMarket?.brown?.pricePerShare ?? 0;
      const next = gameReducer(state, {
        type: 'SELL_HOUSE',
        propertyId: targetSpace.id,
      });
      expect(next.stockMarket?.brown?.pricePerShare).toBe(
        Math.max(beforePrice - HOUSE_PRICE_BOOST, STOCK_MIN_PRICE),
      );
    });
  });

  describe('OPEN/CLOSE dialog actions', () => {
    it('OPEN_STOCK_DIALOG: stocks OFF時は state 不変', () => {
      const state = startGame({ stocks: false });
      const next = gameReducer(state, { type: 'OPEN_STOCK_DIALOG' });
      expect(next).toBe(state);
    });

    it('OPEN_STOCK_DIALOG: stocks ON時は turnPhase=stock', () => {
      const state = startGame({ stocks: true });
      const next = gameReducer(state, { type: 'OPEN_STOCK_DIALOG' });
      expect(next.turnPhase).toBe('stock');
    });

    it('CLOSE_STOCK_DIALOG: stock 状態時のみ endTurn へ遷移', () => {
      let state = startGame({ stocks: true });
      state = gameReducer(state, { type: 'OPEN_STOCK_DIALOG' });
      const next = gameReducer(state, { type: 'CLOSE_STOCK_DIALOG' });
      expect(next.turnPhase).toBe('endTurn');
    });
  });
});

describe('distributeSocialDividend 統合テスト (GO通過)', () => {
  function makeGoPassState(
    features: { progressiveTax?: boolean; basicIncome?: boolean },
    playerMoney: number,
  ): GameState {
    const state = gameReducer(createInitialGameState(), {
      type: 'START_GAME',
      playerNames: ['たろう', 'はなこ'],
      playerTokens: ['🚗', '🎩'],
      features,
    });
    return {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, position: 38, money: playerMoney } : p,
      ),
      dice: { values: [3, 3], doubles: 0, rolled: true },
      turnPhase: 'moving',
    };
  }

  it('機能フラグ未設定: 常に SOCIAL_DIVIDEND_SELF を受け取る', () => {
    const state = makeGoPassState({}, 3500);
    const next = gameReducer(state, { type: 'FINISH_MOVING' });
    expect(next.players[0].money).toBe(3500 + SOCIAL_DIVIDEND_SELF);
  });

  it('progressiveTax のみ有効: 高資産プレイヤーが課税される', () => {
    // 資産 3500: 3000-6000 ブラケット → 10%課税
    const state = makeGoPassState({ progressiveTax: true }, 3500);
    const next = gameReducer(state, { type: 'FINISH_MOVING' });
    const tax = calculateProgressiveTax(SOCIAL_DIVIDEND_SELF, 3500);
    expect(next.players[0].money).toBe(3500 + SOCIAL_DIVIDEND_SELF - tax);
  });

  it('progressiveTax のみ有効: 低資産プレイヤーは課税なし', () => {
    // 資産 1500: 3000未満 → 0%課税
    const state = makeGoPassState({ progressiveTax: true }, 1500);
    const next = gameReducer(state, { type: 'FINISH_MOVING' });
    expect(next.players[0].money).toBe(1500 + SOCIAL_DIVIDEND_SELF);
  });

  it('basicIncome のみ有効: 低資産プレイヤーがボーナスを受け取る', () => {
    // 資産 1000 <= BASIC_INCOME_THRESHOLD
    const state = makeGoPassState({ basicIncome: true }, 1000);
    const next = gameReducer(state, { type: 'FINISH_MOVING' });
    expect(next.players[0].money).toBe(
      1000 + SOCIAL_DIVIDEND_SELF + BASIC_INCOME_BONUS,
    );
  });

  it('basicIncome のみ有効: 高資産プレイヤーはボーナスなし', () => {
    // 資産 2000 > BASIC_INCOME_THRESHOLD
    const state = makeGoPassState({ basicIncome: true }, 2000);
    const next = gameReducer(state, { type: 'FINISH_MOVING' });
    expect(next.players[0].money).toBe(2000 + SOCIAL_DIVIDEND_SELF);
  });

  it('両フラグ有効・高資産: 課税のみ適用（ボーナスなし）、課税が先に行われる', () => {
    // 資産 4000: 10%課税、threshold超のためボーナスなし
    const state = makeGoPassState(
      { progressiveTax: true, basicIncome: true },
      4000,
    );
    const next = gameReducer(state, { type: 'FINISH_MOVING' });
    const tax = calculateProgressiveTax(SOCIAL_DIVIDEND_SELF, 4000);
    expect(next.players[0].money).toBe(4000 + SOCIAL_DIVIDEND_SELF - tax);
  });

  it('両フラグ有効・低資産: ボーナスのみ適用（課税なし）', () => {
    // 資産 1000: 課税なし（3000未満）、ボーナスあり
    const state = makeGoPassState(
      { progressiveTax: true, basicIncome: true },
      1000,
    );
    const next = gameReducer(state, { type: 'FINISH_MOVING' });
    expect(next.players[0].money).toBe(
      1000 + SOCIAL_DIVIDEND_SELF + BASIC_INCOME_BONUS,
    );
  });

  it('課税は配当を超えない（最高税率でも最低0）', () => {
    // 資産 99999: 最高税率40%、税額 = floor(150 * 0.4) = 60 < 150
    const state = makeGoPassState({ progressiveTax: true }, 99999);
    const next = gameReducer(state, { type: 'FINISH_MOVING' });
    expect(next.players[0].money).toBeGreaterThanOrEqual(99999);
  });

  it('他プレイヤーは GO 通過者の課税に関わらず SOCIAL_DIVIDEND_OTHERS を受け取る', () => {
    const state = makeGoPassState({ progressiveTax: true }, 3500);
    const beforeMoney = state.players[1].money;
    const next = gameReducer(state, { type: 'FINISH_MOVING' });
    expect(next.players[1].money).toBe(beforeMoney + SOCIAL_DIVIDEND_OTHERS);
  });
});

// 型エクスポート確認用の no-op（未使用 import 警告回避）
const _color: ColorGroup = 'brown';
void _color;

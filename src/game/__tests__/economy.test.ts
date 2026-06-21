import { describe, it, expect } from 'vitest';
import type { ColorGroup, FeatureFlags, GameState, Player } from '../types';
import { BOARD_SPACES } from '../board';
import { createInitialGameState, gameReducer } from '../reducer';
import {
  DIVIDEND_RATE_PCT,
  FORCE_BUY_MULTIPLIER_MAX,
  FORCE_BUY_MULTIPLIER_MIN,
  FORCE_BUY_POISON_PILL_BONUS,
  HOUSE_PRICE_BOOST,
  PRICE_DELTA_PER_SHARE,
  STOCK_INITIAL_PRICE,
  STOCK_MIN_PRICE,
  STOCK_TOTAL_SHARES,
  calculateDividendPool,
  calculateForceBuyMultiplier,
  calculateNextPrice,
  createInitialStockMarket,
  distributeDividends,
  getEffectiveStockPrice,
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

function startGame(features?: FeatureFlags): GameState {
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

  describe('getEffectiveStockPrice', () => {
    it('景気ステータス未指定なら基準価格をそのまま返す（既存挙動互換）', () => {
      expect(getEffectiveStockPrice(100)).toBe(100);
    });

    it('通常時は基準価格と一致する', () => {
      expect(getEffectiveStockPrice(100, 'normal')).toBe(100);
    });

    it('好況時は実効株価が上がり、金融危機時は下がる', () => {
      expect(getEffectiveStockPrice(100, 'boom')).toBe(130);
      expect(getEffectiveStockPrice(100, 'recession')).toBe(70);
      expect(getEffectiveStockPrice(100, 'crisis')).toBe(40);
    });

    it('金融危機で下がった実効株価は景気回復で元の水準へ戻る（片道暴落の解消）', () => {
      const base = 100;
      const crashed = getEffectiveStockPrice(base, 'crisis');
      const recovered = getEffectiveStockPrice(base, 'normal');
      expect(crashed).toBeLessThan(base);
      expect(recovered).toBe(base);
    });
  });

  describe('景気連動の売買価格（macroEconomy 有効）', () => {
    function economyState(status: GameState['economyStatus']): GameState {
      const base = startGame({ stocks: true });
      return {
        ...base,
        features: { ...base.features, stocks: true, macroEconomy: true },
        economyStatus: status,
      };
    }

    it('金融危機時は購入コストが基準価格より安くなる', () => {
      const result = validateStockBuy(
        economyState('crisis'),
        'player-0',
        'brown',
        1,
      );
      // 基準 100 × crisis 0.4 = 40
      expect(result).toEqual({ ok: true, cost: 40 });
    });

    it('景気回復（通常）で購入コストが基準価格へ戻る', () => {
      const result = validateStockBuy(
        economyState('normal'),
        'player-0',
        'brown',
        1,
      );
      expect(result).toEqual({ ok: true, cost: STOCK_INITIAL_PRICE });
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
      // 株価は 2 * PRICE_DELTA_PER_SHARE 上昇
      expect(next.stockMarket?.brown?.pricePerShare).toBe(
        beforePrice + 2 * PRICE_DELTA_PER_SHARE,
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

    it('CLOSE_STOCK_DIALOG: stock 状態時のみ roll/endTurn へ遷移', () => {
      let state = startGame({ stocks: true });
      state = gameReducer(state, { type: 'OPEN_STOCK_DIALOG' });
      const next = gameReducer(state, { type: 'CLOSE_STOCK_DIALOG' });
      expect(next.turnPhase).toBe('roll'); // default starts with rolled: false
    });

    it('CLOSE_STOCK_DIALOG: rolled=true のとき endTurn へ遷移', () => {
      let state = startGame({ stocks: true });
      state = { ...state, dice: { ...state.dice, rolled: true } };
      state = gameReducer(state, { type: 'OPEN_STOCK_DIALOG' });
      const next = gameReducer(state, { type: 'CLOSE_STOCK_DIALOG' });
      expect(next.turnPhase).toBe('endTurn');
    });

    it('CLOSE_ALT_ASSET_DIALOG: rolled=false のとき roll へ遷移', () => {
      let state = startGame({ altAssets: true });
      state = gameReducer(state, { type: 'OPEN_ALT_ASSET_DIALOG' });
      const next = gameReducer(state, { type: 'CLOSE_ALT_ASSET_DIALOG' });
      expect(next.turnPhase).toBe('roll');
    });

    it('CLOSE_ALT_ASSET_DIALOG: rolled=true のとき endTurn へ遷移', () => {
      let state = startGame({ altAssets: true });
      state = { ...state, dice: { ...state.dice, rolled: true } };
      state = gameReducer(state, { type: 'OPEN_ALT_ASSET_DIALOG' });
      const next = gameReducer(state, { type: 'CLOSE_ALT_ASSET_DIALOG' });
      expect(next.turnPhase).toBe('endTurn');
    });
  });
});

// ── calculateForceBuyMultiplier ──

describe('calculateForceBuyMultiplier', () => {
  it('家なし(0)で最小乗数を返す', () => {
    expect(calculateForceBuyMultiplier(0)).toBe(FORCE_BUY_MULTIPLIER_MIN);
  });

  it('ホテル(5)で最大乗数を返す', () => {
    expect(calculateForceBuyMultiplier(5)).toBe(FORCE_BUY_MULTIPLIER_MAX);
  });

  it('家2つで線形補間した乗数を返す', () => {
    // 3 + (5-3)*2/5 = 3.8
    expect(calculateForceBuyMultiplier(2)).toBeCloseTo(3.8);
  });

  it('範囲外の値は端点にクランプされる', () => {
    expect(calculateForceBuyMultiplier(-1)).toBe(FORCE_BUY_MULTIPLIER_MIN);
    expect(calculateForceBuyMultiplier(99)).toBe(FORCE_BUY_MULTIPLIER_MAX);
  });

  it('ポイズンピル有効時は乗数にボーナスが加算される', () => {
    expect(calculateForceBuyMultiplier(0, true)).toBe(
      FORCE_BUY_MULTIPLIER_MIN + FORCE_BUY_POISON_PILL_BONUS,
    );
  });

  it('ポイズンピル有効時はホテルでも最大+ボーナスを返す', () => {
    expect(calculateForceBuyMultiplier(5, true)).toBe(
      FORCE_BUY_MULTIPLIER_MAX + FORCE_BUY_POISON_PILL_BONUS,
    );
  });

  it('ポイズンピル無効(false)はデフォルトと同じ動作', () => {
    expect(calculateForceBuyMultiplier(0, false)).toBe(
      FORCE_BUY_MULTIPLIER_MIN,
    );
  });
});

// 型エクスポート確認用の no-op（未使用 import 警告回避）
const _color: ColorGroup = 'brown';
void _color;

import { describe, it, expect } from 'vitest';
import type { GameState, Player } from '../types';
import { BOARD_SPACES } from '../board';
import { createInitialGameState, gameReducer } from '../reducer';
import {
  DIVIDEND_RATE_PCT,
  INVESTMENT_COST,
  INVESTMENT_STOCK_BOOST,
  STOCK_INITIAL_PRICE,
  STOCK_TOTAL_SHARES,
  calculateDividendPool,
  createInitialStockMarket,
  distributeDividends,
  isStocksEnabled,
  isInvestmentEnabled,
  validateInvestment,
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

function startGame(features?: {
  stocks?: boolean;
  investment?: boolean;
}): GameState {
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
      // 対象プレイヤーがいないので配当ゼロ
      expect(result).toEqual({});
    });

    it('持株比率に応じて配分（対象内合計を分母にする）', () => {
      const players: Player[] = [
        makePlayer({ id: 'owner' }),
        makePlayer({ id: 'payer' }),
        makePlayer({ id: 'a', stocks: { brown: 30 } }),
        makePlayer({ id: 'b', stocks: { brown: 10 } }),
      ];
      // pool = 1000 * 10% = 100
      // 対象株: 30 + 10 = 40
      // a への配当: floor(100 * 30 / 40) = 75
      // b への配当: floor(100 * 10 / 40) = 25
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
      expect(validateStockBuy(state, 'player-0', 'brown', -1)).toEqual({
        ok: false,
        reason: 'INVALID_SHARES',
      });
    });

    it('資金不足なら INSUFFICIENT_FUNDS', () => {
      const state = startGame({ stocks: true });
      // player-0 は $1500、株価 $100 → 100 株は $10000 で資金不足
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

  describe('validateInvestment', () => {
    it('investment OFF なら INVESTMENT_DISABLED', () => {
      const state = startGame({ investment: false });
      const result = validateInvestment(state, 'player-0', 'mediterranean');
      expect(result).toEqual({
        ok: false,
        reason: 'INVESTMENT_DISABLED',
      });
    });

    it('所有していない物件は NOT_OWNER', () => {
      const state = startGame({ investment: true });
      const result = validateInvestment(state, 'player-0', 'mediterranean');
      expect(result).toEqual({ ok: false, reason: 'NOT_OWNER' });
    });
  });

  describe('featureFlags', () => {
    it('OFF時は isStocksEnabled / isInvestmentEnabled が false', () => {
      const state = startGame();
      expect(isStocksEnabled(state)).toBe(false);
      expect(isInvestmentEnabled(state)).toBe(false);
    });

    it('ON時は stockMarket が初期化される', () => {
      const state = startGame({ stocks: true });
      expect(state.stockMarket).toBeDefined();
      expect(isStocksEnabled(state)).toBe(true);
    });

    it('OFF時は stockMarket が undefined のまま（既存挙動互換）', () => {
      const state = startGame();
      expect(state.stockMarket).toBeUndefined();
    });
  });
});

describe('reducer P1 拡張', () => {
  describe('BUY_STOCK', () => {
    it('正常な購入で money 減算・stocks 加算・bankShares 減算', () => {
      const state = startGame({ stocks: true });
      const next = gameReducer(state, {
        type: 'BUY_STOCK',
        color: 'brown',
        shares: 2,
      });
      const buyer = next.players[0];
      expect(buyer.money).toBe(1500 - STOCK_INITIAL_PRICE * 2);
      expect(buyer.stocks?.brown).toBe(2);
      expect(next.stockMarket?.brown?.bankShares).toBe(STOCK_TOTAL_SHARES - 2);
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
    it('購入後の売却で保有数 0・所持金復元', () => {
      let state = startGame({ stocks: true });
      state = gameReducer(state, {
        type: 'BUY_STOCK',
        color: 'brown',
        shares: 3,
      });
      const afterBuy = state.players[0];
      expect(afterBuy.stocks?.brown).toBe(3);
      state = gameReducer(state, {
        type: 'SELL_STOCK',
        color: 'brown',
        shares: 3,
      });
      const afterSell = state.players[0];
      expect(afterSell.stocks?.brown).toBeUndefined();
      expect(afterSell.money).toBe(1500);
      expect(state.stockMarket?.brown?.bankShares).toBe(STOCK_TOTAL_SHARES);
    });
  });

  describe('INVEST_PROPERTY', () => {
    it('investment OFF なら state 不変', () => {
      const state = startGame({ investment: false });
      const next = gameReducer(state, {
        type: 'INVEST_PROPERTY',
        propertyId: 'mediterranean',
      });
      expect(next).toBe(state);
    });

    it('所有していない物件への投資は state 不変', () => {
      const state = startGame({ investment: true });
      const next = gameReducer(state, {
        type: 'INVEST_PROPERTY',
        propertyId: 'mediterranean',
      });
      expect(next).toBe(state);
    });

    it('所有物件への投資でコスト減算・株価上昇', () => {
      let state = startGame({ stocks: true, investment: true });
      // 手動で物件所有を設定
      const mediterranean = BOARD_SPACES.find((s) => s.id === 'mediterranean')!;
      state = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0 ? { ...p, properties: ['mediterranean'] } : p,
        ),
        propertyStates: {
          ...state.propertyStates,
          mediterranean: {
            ownerId: 'player-0',
            houses: 0,
            isMortgaged: false,
          },
        },
      };
      const beforePrice =
        state.stockMarket?.[mediterranean.color!]?.pricePerShare;
      const next = gameReducer(state, {
        type: 'INVEST_PROPERTY',
        propertyId: 'mediterranean',
      });
      const investor = next.players[0];
      expect(investor.money).toBe(1500 - INVESTMENT_COST);
      const afterPrice =
        next.stockMarket?.[mediterranean.color!]?.pricePerShare;
      expect(afterPrice).toBe((beforePrice ?? 0) + INVESTMENT_STOCK_BOOST);
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

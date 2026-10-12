import { describe, it, expect } from 'vitest';
import type { FeatureFlags, GameState } from '../types';
import { createInitialGameState, gameReducer } from '../reducer';
import {
  getStockBuyPrice,
  isStockBubbleEffective,
  validateStockBuy,
  validateStockSell,
  STOCK_INITIAL_PRICE,
} from '../economy';
import {
  BUBBLE_DURATION_TURNS,
  BUBBLE_MULTIPLIER,
  BUBBLE_NET_BUY_THRESHOLD,
} from '../systems/behavioralBias';

function startGame(features?: FeatureFlags): GameState {
  const s = gameReducer(createInitialGameState(), {
    type: 'START_GAME',
    playerNames: ['たろう', 'はなこ'],
    playerTokens: ['🚗', '🎩'],
    features,
  });
  // 資金は十分に持たせ、買いの検証が資金不足で落ちないようにする
  return {
    ...s,
    players: s.players.map((p) => ({ ...p, money: 100000 })),
  };
}

function buy(state: GameState, shares: number): GameState {
  return gameReducer(state, { type: 'BUY_STOCK', color: 'brown', shares });
}

function endTurn(state: GameState): GameState {
  return gameReducer(state, { type: 'END_TURN' });
}

const ON: FeatureFlags = { stocks: true, behavioralBias: true };

describe('行動経済学バイアスの結線', () => {
  describe('機能フラグ OFF は既存挙動と完全互換', () => {
    it('behavioralBias OFF では状態キーが付かず、売買・END_TURN の結果が変わらない', () => {
      const off = startGame({ stocks: true });
      expect(off.behavioralBias).toBeUndefined();
      let s = buy(off, BUBBLE_NET_BUY_THRESHOLD);
      expect(s.behavioralBias).toBeUndefined();
      s = endTurn(s);
      expect(s.behavioralBias).toBeUndefined();
      // 次の手番でも買い価格は基準価格どおり
      expect(getStockBuyPrice(s, 'brown')).toBe(
        s.stockMarket!.brown!.pricePerShare,
      );
    });

    it('stocks OFF なら behavioralBias ON でも作動しない', () => {
      const s = startGame({ stocks: false, behavioralBias: true });
      expect(s.behavioralBias).toBeUndefined();
      expect(isStockBubbleEffective(s, 'brown')).toBe(false);
    });
  });

  describe('バブルの開始と買い価格', () => {
    it('閾値の買い越しで開始し、同じ手番は乗数 1.0、次の手番から買い価格だけ割高になる', () => {
      let s = startGame(ON);
      expect(s.behavioralBias).toEqual({});
      s = buy(s, BUBBLE_NET_BUY_THRESHOLD);
      expect(s.behavioralBias?.brown?.bubbleStartedTurn).toBe(0);
      expect(s.message).toContain('バブル');
      // 同じ手番: 買い価格に乗数は掛からない
      expect(isStockBubbleEffective(s, 'brown')).toBe(false);
      const base = s.stockMarket!.brown!.pricePerShare;
      expect(getStockBuyPrice(s, 'brown')).toBe(base);

      s = endTurn(s);
      expect(isStockBubbleEffective(s, 'brown')).toBe(true);
      const buyPrice = Math.floor(base * BUBBLE_MULTIPLIER + 1e-9);
      expect(getStockBuyPrice(s, 'brown')).toBe(buyPrice);
      // 請求（validateStockBuy）は表示と同じ買い価格
      const v = validateStockBuy(
        s,
        s.players[s.currentPlayerIndex].id,
        'brown',
        2,
      );
      expect(v).toEqual({ ok: true, cost: buyPrice * 2 });
    });

    it('売り価格（validateStockSell）にはバブル乗数を掛けない', () => {
      let s = startGame(ON);
      s = buy(s, BUBBLE_NET_BUY_THRESHOLD);
      s = endTurn(s);
      s = endTurn(s); // 買った本人（index 0）の手番へ戻す
      const holder = s.players[s.currentPlayerIndex];
      const base = s.stockMarket!.brown!.pricePerShare;
      expect(isStockBubbleEffective(s, 'brown')).toBe(true);
      const v = validateStockSell(s, holder.id, 'brown', 1);
      expect(v).toEqual({ ok: true, proceeds: base });
    });

    it('他の色には波及しない', () => {
      let s = startGame(ON);
      s = buy(s, BUBBLE_NET_BUY_THRESHOLD);
      s = endTurn(s);
      expect(isStockBubbleEffective(s, 'blue')).toBe(false);
      expect(getStockBuyPrice(s, 'blue')).toBe(STOCK_INITIAL_PRICE);
    });
  });

  describe('崩壊', () => {
    it('有効期間が過ぎたら END_TURN で崩壊し、種明かしが表示され、買い価格は基準へ戻る', () => {
      let s = startGame(ON);
      s = buy(s, BUBBLE_NET_BUY_THRESHOLD);
      for (let i = 0; i < BUBBLE_DURATION_TURNS; i++) {
        s = endTurn(s);
        expect(s.behavioralBias?.brown?.bubbleStartedTurn).toBe(0);
      }
      s = endTurn(s);
      expect(s.behavioralBias?.brown?.bubbleStartedTurn).toBeNull();
      expect(s.message).toContain('はじけた');
      expect(getStockBuyPrice(s, 'brown')).toBe(
        s.stockMarket!.brown!.pricePerShare,
      );
    });

    it('金融危機と同時でも減少率は二重に適用されない（景気乗数だけの水準になる）', () => {
      let s = startGame({ ...ON, macroEconomy: true });
      s = buy(s, BUBBLE_NET_BUY_THRESHOLD);
      s = endTurn(s);
      s = { ...s, economyStatus: 'crisis' };
      const base = s.stockMarket!.brown!.pricePerShare;
      // 危機の下では買い価格 = 基準 × 0.4 × 1.4
      expect(getStockBuyPrice(s, 'brown')).toBe(
        Math.floor(base * 0.4 * BUBBLE_MULTIPLIER + 1e-9),
      );
      s = endTurn(s);
      expect(s.behavioralBias?.brown?.bubbleStartedTurn).toBeNull();
      expect(s.stockMarket!.brown!.pricePerShare).toBe(base);
      expect(getStockBuyPrice(s, 'brown')).toBe(Math.floor(base * 0.4));
    });
  });
});

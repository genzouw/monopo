import { describe, it, expect } from 'vitest';
import {
  BUBBLE_DURATION_TURNS,
  BUBBLE_MULTIPLIER,
  BUBBLE_NET_BUY_THRESHOLD,
  BUBBLE_WINDOW_TURNS,
  advanceBiasTurn,
  composeBubbleFactor,
  composeBubblePrice,
  isBubbleEffective,
  createInitialBiasState,
  isBehavioralBiasActive,
  isBubble,
  recordStockTrade,
} from '../systems/behavioralBias';
import { getEffectiveStockPrice } from '../economy';

const T = BUBBLE_NET_BUY_THRESHOLD;

describe('behavioralBias', () => {
  describe('isBehavioralBiasActive', () => {
    it('stocks と behavioralBias の両方が true のときだけ作動する', () => {
      expect(
        isBehavioralBiasActive({ stocks: true, behavioralBias: true }),
      ).toBe(true);
      expect(
        isBehavioralBiasActive({ stocks: false, behavioralBias: true }),
      ).toBe(false);
      expect(isBehavioralBiasActive({ stocks: true })).toBe(false);
      expect(isBehavioralBiasActive(undefined)).toBe(false);
    });
  });

  describe('recordStockTrade', () => {
    it('閾値ちょうどでバブルに入り、種明かしが付く', () => {
      const r = recordStockTrade(createInitialBiasState(), 'red', T, 1);
      expect(isBubble(r.state, 'red')).toBe(true);
      expect(r.event?.kind).toBe('bubbleStarted');
      expect(r.event?.color).toBe('red');
      expect(r.event?.message).toContain('FOMO');
    });

    it('閾値の 1 株手前ではバブルに入らない', () => {
      const r = recordStockTrade(createInitialBiasState(), 'red', T - 1, 1);
      expect(isBubble(r.state, 'red')).toBe(false);
      expect(r.event).toBeNull();
    });

    it('複数ターンの買い越しを窓内で合算する', () => {
      let s = createInitialBiasState();
      s = recordStockTrade(s, 'blue', 4, 1).state;
      s = recordStockTrade(s, 'blue', 4, 2).state;
      expect(isBubble(s, 'blue')).toBe(false);
      const r = recordStockTrade(s, 'blue', 2, 3);
      expect(isBubble(r.state, 'blue')).toBe(true);
    });

    it('窓の外に出た古い買いは数えない', () => {
      let s = createInitialBiasState();
      s = recordStockTrade(s, 'blue', T - 1, 1).state;
      const r = recordStockTrade(s, 'blue', 1, 4);
      expect(isBubble(r.state, 'blue')).toBe(false);
    });

    it('売りは買い越しから差し引かれる', () => {
      let s = createInitialBiasState();
      s = recordStockTrade(s, 'pink', T - 1, 1).state;
      s = recordStockTrade(s, 'pink', -5, 1).state;
      expect(isBubble(recordStockTrade(s, 'pink', 5, 2).state, 'pink')).toBe(
        false,
      );
    });

    it('他の色には影響しない', () => {
      const r = recordStockTrade(createInitialBiasState(), 'red', T, 1);
      expect(isBubble(r.state, 'green')).toBe(false);
    });

    it('バブル中の追加の買いでは再突入のイベントを出さない', () => {
      const first = recordStockTrade(createInitialBiasState(), 'red', T, 1);
      const again = recordStockTrade(first.state, 'red', T, 2);
      expect(again.event).toBeNull();
      expect(isBubble(again.state, 'red')).toBe(true);
    });

    it('0 株・非有限値は何もしない', () => {
      const s = createInitialBiasState();
      expect(recordStockTrade(s, 'red', 0, 1).state).toBe(s);
      expect(recordStockTrade(s, 'red', NaN, 1).state).toBe(s);
    });

    it('入力の状態を破壊しない', () => {
      const s = recordStockTrade(createInitialBiasState(), 'red', 3, 1).state;
      const snapshot = JSON.stringify(s);
      recordStockTrade(s, 'red', 3, 1);
      expect(JSON.stringify(s)).toBe(snapshot);
    });
  });

  describe('advanceBiasTurn', () => {
    const bubbleAt1 = recordStockTrade(
      createInitialBiasState(),
      'red',
      T,
      1,
    ).state;

    it('開始から 4 手番後（有効 4 手番目）まで崩壊しない', () => {
      const r = advanceBiasTurn(bubbleAt1, 5, 'normal');
      expect(isBubble(r.state, 'red')).toBe(true);
      expect(r.events).toEqual([]);
    });

    it('開始から 5 手番後（有効 4 手番が過ぎた）に崩壊し、種明かしが付く', () => {
      const r = advanceBiasTurn(bubbleAt1, 6, 'normal');
      expect(isBubble(r.state, 'red')).toBe(false);
      expect(r.events).toHaveLength(1);
      expect(r.events[0].kind).toBe('bubbleBurst');
      expect(r.events[0].message).toContain('バブル');
    });

    it('不況・金融危機への遷移で、期間内でも崩壊する', () => {
      for (const status of ['recession', 'crisis'] as const) {
        const r = advanceBiasTurn(bubbleAt1, 2, status);
        expect(isBubble(r.state, 'red')).toBe(false);
        expect(r.events).toHaveLength(1);
      }
    });

    it('崩壊後はすぐに再突入しない（履歴を消す）', () => {
      const burst = advanceBiasTurn(bubbleAt1, 2, 'crisis').state;
      const r = recordStockTrade(burst, 'red', T - 1, 2);
      expect(isBubble(r.state, 'red')).toBe(false);
    });

    it('崩壊と同じターンに閾値以上を買っても、不況・金融危機中は再突入しない', () => {
      for (const status of ['recession', 'crisis'] as const) {
        const burst = advanceBiasTurn(bubbleAt1, 2, status).state;
        const r = recordStockTrade(burst, 'red', T, 2, status);
        expect(isBubble(r.state, 'red')).toBe(false);
        expect(r.event).toBeNull();
      }
    });

    it('景気が平常に戻れば、閾値以上の買いで再びバブルに入れる', () => {
      const r = recordStockTrade(
        createInitialBiasState(),
        'red',
        T,
        5,
        'normal',
      );
      expect(isBubble(r.state, 'red')).toBe(true);
    });

    it('崩壊メッセージは基準価格に戻るとは言わず、上乗せ分がなくなると伝える', () => {
      const r = advanceBiasTurn(bubbleAt1, 2, 'crisis');
      expect(r.events[0].message).toContain('うわのせ');
      expect(r.events[0].message).not.toContain('もとの たかさ');
    });

    it('バブルでない色は何も起きず、古い履歴だけが掃除される', () => {
      const s = recordStockTrade(createInitialBiasState(), 'blue', 3, 1).state;
      const r = advanceBiasTurn(s, 4, 'crisis');
      expect(r.events).toEqual([]);
      expect(r.state.blue).toBeUndefined();
    });

    it('景気が未指定（macroEconomy OFF）でも期間で崩壊する', () => {
      const r = advanceBiasTurn(bubbleAt1, 6);
      expect(isBubble(r.state, 'red')).toBe(false);
    });
  });

  describe('isBubbleEffective', () => {
    const s = recordStockTrade(createInitialBiasState(), 'red', T, 3).state;

    it('開始手番では有効でなく、次の手番から有効になる', () => {
      expect(isBubble(s, 'red')).toBe(true);
      expect(isBubbleEffective(s, 'red', 3)).toBe(false);
      expect(isBubbleEffective(s, 'red', 4)).toBe(true);
    });

    it('バブルのない色は有効でない', () => {
      expect(isBubbleEffective(s, 'blue', 4)).toBe(false);
      expect(isBubbleEffective(createInitialBiasState(), 'red', 4)).toBe(false);
    });

    it('10 株を買った同じ手番では、買っても売っても乗数が掛からない', () => {
      const eff = isBubbleEffective(s, 'red', 3);
      expect(composeBubblePrice(100, eff, 'normal', 'buy')).toBe(100);
      expect(composeBubblePrice(100, eff, 'normal', 'sell')).toBe(100);
    });
  });

  describe('composeBubbleFactor', () => {
    it('範囲内ではそのまま積を返す', () => {
      expect(composeBubbleFactor(0.7, 1.4)).toBeCloseTo(0.98);
    });

    it('上限 2.0 を超える積は 2.0 にクランプする', () => {
      expect(composeBubbleFactor(1.8, 1.4)).toBe(2.0);
    });

    it('下限 0.3 を下回る積は 0.3 にクランプする', () => {
      expect(composeBubbleFactor(0.2, 1.4)).toBe(0.3);
    });
  });

  describe('定数（Issue の推奨値）', () => {
    it('値を固定する', () => {
      expect(BUBBLE_WINDOW_TURNS).toBe(3);
      expect(BUBBLE_NET_BUY_THRESHOLD).toBe(10);
      expect(BUBBLE_MULTIPLIER).toBe(1.4);
      expect(BUBBLE_DURATION_TURNS).toBe(4);
    });
  });

  describe('composeBubblePrice', () => {
    it('バブルでなければ getEffectiveStockPrice と一致する', () => {
      for (const status of [
        undefined,
        'boom',
        'normal',
        'recession',
        'crisis',
      ] as const) {
        expect(composeBubblePrice(137, false, status, 'buy')).toBe(
          getEffectiveStockPrice(137, status),
        );
      }
    });

    it('景気 OFF のバブルは買い価格に乗数だけを掛ける', () => {
      expect(composeBubblePrice(100, true, undefined, 'buy')).toBe(140);
    });

    it('景気乗数とバブル乗数は積で合成される', () => {
      expect(composeBubblePrice(100, true, 'recession', 'buy')).toBe(98);
      expect(composeBubblePrice(100, true, 'boom', 'buy')).toBe(182);
    });

    it('バブル中でも売り価格には乗数を掛けない', () => {
      for (const status of [undefined, 'boom', 'normal', 'crisis'] as const) {
        expect(composeBubblePrice(100, true, status, 'sell')).toBe(
          getEffectiveStockPrice(100, status),
        );
      }
    });

    it('崩壊後の価格は基準価格（景気のみ）へ戻る', () => {
      const base = 120;
      expect(composeBubblePrice(base, true, 'normal', 'buy')).toBeGreaterThan(
        base,
      );
      const s = recordStockTrade(createInitialBiasState(), 'red', T, 1).state;
      const burst = advanceBiasTurn(s, 6, 'normal').state;
      const eff = isBubbleEffective(burst, 'red', 6);
      expect(composeBubblePrice(base, eff, 'normal', 'buy')).toBe(base);
    });

    it('金融危機と崩壊が同時でも減少率は景気乗数の 1 回分だけ', () => {
      const base = 100;
      const s = recordStockTrade(createInitialBiasState(), 'red', T, 1).state;
      const burst = advanceBiasTurn(s, 2, 'crisis').state;
      const eff = isBubbleEffective(burst, 'red', 2);
      const price = composeBubblePrice(base, eff, 'crisis', 'buy');
      expect(price).toBe(getEffectiveStockPrice(base, 'crisis'));
      expect(price).toBe(40);
    });
  });
});

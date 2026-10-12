import { describe, it, expect } from 'vitest';
import {
  BUBBLE_DURATION_TURNS,
  BUBBLE_MULTIPLIER,
  BUBBLE_NET_BUY_THRESHOLD,
  BUBBLE_WINDOW_TURNS,
  advanceBiasTurn,
  composeBubblePrice,
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
      const r = recordStockTrade(s, 'blue', 1, 1 + BUBBLE_WINDOW_TURNS);
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

    it('開始から規定ターン未満では崩壊しない', () => {
      const r = advanceBiasTurn(
        bubbleAt1,
        1 + BUBBLE_DURATION_TURNS - 1,
        'normal',
      );
      expect(isBubble(r.state, 'red')).toBe(true);
      expect(r.events).toEqual([]);
    });

    it('開始から規定ターンちょうどで崩壊し、種明かしが付く', () => {
      const r = advanceBiasTurn(bubbleAt1, 1 + BUBBLE_DURATION_TURNS, 'normal');
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
      const r = advanceBiasTurn(s, 1 + BUBBLE_WINDOW_TURNS, 'crisis');
      expect(r.events).toEqual([]);
      expect(r.state.blue).toBeUndefined();
    });

    it('景気が未指定（macroEconomy OFF）でも期間で崩壊する', () => {
      const r = advanceBiasTurn(bubbleAt1, 1 + BUBBLE_DURATION_TURNS);
      expect(isBubble(r.state, 'red')).toBe(false);
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
        expect(composeBubblePrice(137, false, status)).toBe(
          getEffectiveStockPrice(137, status),
        );
      }
    });

    it('景気 OFF のバブルは基準価格に乗数だけを掛ける', () => {
      expect(composeBubblePrice(100, true)).toBe(
        Math.floor(100 * BUBBLE_MULTIPLIER),
      );
    });

    it('景気乗数とバブル乗数は積で合成される', () => {
      expect(composeBubblePrice(100, true, 'recession')).toBe(98);
    });

    it('好況でも 2.0 倍を超えず発散しない', () => {
      expect(composeBubblePrice(100, true, 'boom')).toBeLessThanOrEqual(200);
      expect(composeBubblePrice(100, true, 'boom')).toBe(182);
    });

    it('崩壊後の価格は基準価格（景気のみ）へ戻る', () => {
      const base = 120;
      const bubbled = composeBubblePrice(base, true, 'normal');
      expect(bubbled).toBeGreaterThan(base);
      const s = recordStockTrade(createInitialBiasState(), 'red', T, 1).state;
      const burst = advanceBiasTurn(
        s,
        1 + BUBBLE_DURATION_TURNS,
        'normal',
      ).state;
      expect(composeBubblePrice(base, isBubble(burst, 'red'), 'normal')).toBe(
        base,
      );
    });

    it('金融危機と崩壊が同時でも減少率は景気乗数の 1 回分だけ', () => {
      const base = 100;
      const s = recordStockTrade(createInitialBiasState(), 'red', T, 1).state;
      const burst = advanceBiasTurn(s, 2, 'crisis').state;
      const price = composeBubblePrice(base, isBubble(burst, 'red'), 'crisis');
      expect(price).toBe(getEffectiveStockPrice(base, 'crisis'));
      expect(price).toBe(40);
    });
  });
});

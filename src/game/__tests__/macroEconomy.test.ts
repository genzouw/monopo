import { describe, it, expect } from 'vitest';
import {
  ECONOMY_FACTORS,
  ECONOMY_UPDATE_INTERVAL,
  ECONOMY_TRANSITION_MATRIX,
  applyEconomyFactor,
  shouldUpdateEconomy,
  transitionEconomy,
  isMacroEconomyEnabled,
} from '../systems/macroEconomy';

describe('macroEconomy', () => {
  describe('ECONOMY_FACTORS', () => {
    it('好況=1.3、通常=1.0、不況=0.7、金融危機=0.4', () => {
      expect(ECONOMY_FACTORS.boom).toBe(1.3);
      expect(ECONOMY_FACTORS.normal).toBe(1.0);
      expect(ECONOMY_FACTORS.recession).toBe(0.7);
      expect(ECONOMY_FACTORS.crisis).toBe(0.4);
    });
  });

  describe('ECONOMY_TRANSITION_MATRIX', () => {
    it('各行の合計が1.0', () => {
      for (const row of Object.values(ECONOMY_TRANSITION_MATRIX)) {
        const sum = Object.values(row).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1.0, 5);
      }
    });

    it('好況→金融危機の確率は0', () => {
      expect(ECONOMY_TRANSITION_MATRIX.boom.crisis).toBe(0.0);
    });

    it('金融危機→好況の確率は0', () => {
      expect(ECONOMY_TRANSITION_MATRIX.crisis.boom).toBe(0.0);
    });
  });

  describe('transitionEconomy', () => {
    it('random=0で最初の非ゼロ確率の状態に遷移する（好況→好況）', () => {
      expect(transitionEconomy('boom', 0)).toBe('boom');
    });

    it('好況: random=0.99で不況に遷移する', () => {
      expect(transitionEconomy('boom', 0.99)).toBe('recession');
    });

    it('通常: random=0で好況に遷移する', () => {
      expect(transitionEconomy('normal', 0)).toBe('boom');
    });

    it('金融危機からは確率0の好況へは遷移しない（random=0でも通常に）', () => {
      expect(transitionEconomy('crisis', 0.0)).toBe('normal');
    });

    it('不況: random=0で通常に遷移する', () => {
      // recession→boom確率=0, normal確率=0.35なので0.0でnormal
      expect(transitionEconomy('recession', 0.0)).toBe('normal');
    });
  });

  describe('applyEconomyFactor', () => {
    it('好況時は1.3倍（切り捨て）', () => {
      expect(applyEconomyFactor(100, 'boom')).toBe(130);
      expect(applyEconomyFactor(10, 'boom')).toBe(13);
    });

    it('通常時は1.0倍', () => {
      expect(applyEconomyFactor(100, 'normal')).toBe(100);
      expect(applyEconomyFactor(0, 'normal')).toBe(0);
    });

    it('不況時は0.7倍', () => {
      expect(applyEconomyFactor(100, 'recession')).toBe(70);
    });

    it('金融危機時は0.4倍', () => {
      expect(applyEconomyFactor(100, 'crisis')).toBe(40);
    });

    it('小数点は切り捨て', () => {
      // 7 * 1.3 = 9.1 → 9
      expect(applyEconomyFactor(7, 'boom')).toBe(9);
    });
  });

  describe('shouldUpdateEconomy', () => {
    it('ターン0では更新しない', () => {
      expect(shouldUpdateEconomy(0)).toBe(false);
    });

    it(`${ECONOMY_UPDATE_INTERVAL}ターン目に更新する`, () => {
      expect(shouldUpdateEconomy(ECONOMY_UPDATE_INTERVAL)).toBe(true);
    });

    it(`${ECONOMY_UPDATE_INTERVAL * 2}ターン目に更新する`, () => {
      expect(shouldUpdateEconomy(ECONOMY_UPDATE_INTERVAL * 2)).toBe(true);
    });

    it('5の倍数でないターンでは更新しない', () => {
      expect(shouldUpdateEconomy(3)).toBe(false);
      expect(shouldUpdateEconomy(7)).toBe(false);
      expect(shouldUpdateEconomy(11)).toBe(false);
    });
  });

  describe('isMacroEconomyEnabled', () => {
    it('features.macroEconomy=trueなら有効', () => {
      expect(
        isMacroEconomyEnabled({
          features: { macroEconomy: true },
        } as never),
      ).toBe(true);
    });

    it('features未定義ならfalse', () => {
      expect(isMacroEconomyEnabled({} as never)).toBe(false);
    });

    it('features.macroEconomy=falseならfalse', () => {
      expect(
        isMacroEconomyEnabled({
          features: { macroEconomy: false },
        } as never),
      ).toBe(false);
    });
  });
});

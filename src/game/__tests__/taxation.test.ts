import { describe, it, expect } from 'vitest';
import type { GameState } from '../types';
import {
  PROGRESSIVE_TAX_BRACKETS,
  PUBLIC_FUND_REDISTRIBUTION_THRESHOLD,
  MAX_DONATION_RATE,
  calculateProgressiveTax,
  calculateTaxableIncome,
  calculatePublicFundRedistribution,
  isProgressiveTaxEnabled,
} from '../systems/taxation';

const makeState = (enabled: boolean): Pick<GameState, 'features'> => ({
  features: { progressiveTax: enabled },
});

describe('taxation', () => {
  describe('定数', () => {
    it('公共基金再分配閾値は500', () => {
      expect(PUBLIC_FUND_REDISTRIBUTION_THRESHOLD).toBe(500);
    });

    it('最大寄付率は30%', () => {
      expect(MAX_DONATION_RATE).toBe(0.3);
    });

    it('累進税率ブラケットが存在する', () => {
      expect(PROGRESSIVE_TAX_BRACKETS.length).toBeGreaterThan(0);
    });
  });

  describe('isProgressiveTaxEnabled', () => {
    it('features.progressiveTax=trueで有効', () => {
      expect(isProgressiveTaxEnabled(makeState(true) as GameState)).toBe(true);
    });

    it('features.progressiveTax=falseで無効', () => {
      expect(isProgressiveTaxEnabled(makeState(false) as GameState)).toBe(
        false,
      );
    });

    it('featuresが未定義でも無効', () => {
      expect(isProgressiveTaxEnabled({} as GameState)).toBe(false);
    });
  });

  describe('calculateTaxableIncome', () => {
    it('寄付がなければ配当そのまま', () => {
      expect(calculateTaxableIncome(200, 0)).toBe(200);
    });

    it('寄付額が課税対象収入から控除される', () => {
      expect(calculateTaxableIncome(200, 60)).toBe(140);
    });

    it('寄付額が最大寄付率(30%)を超える場合は上限でキャップ', () => {
      // 200 * 30% = 60が上限、70寄付しようとしても60しか控除されない
      expect(calculateTaxableIncome(200, 70)).toBe(140);
    });

    it('配当が0なら0', () => {
      expect(calculateTaxableIncome(0, 0)).toBe(0);
    });

    it('配当が負なら0', () => {
      expect(calculateTaxableIncome(-100, 0)).toBe(0);
    });
  });

  describe('calculateProgressiveTax', () => {
    it('総資産3000未満: 税率0%', () => {
      expect(calculateProgressiveTax(200, 2999)).toBe(0);
      expect(calculateProgressiveTax(200, 0)).toBe(0);
    });

    it('総資産3000-6000未満: 税率10%', () => {
      expect(calculateProgressiveTax(200, 3000)).toBe(20);
      expect(calculateProgressiveTax(200, 5999)).toBe(20);
    });

    it('総資産6000-10000未満: 税率25%', () => {
      expect(calculateProgressiveTax(200, 6000)).toBe(50);
      expect(calculateProgressiveTax(200, 9999)).toBe(50);
    });

    it('総資産10000以上: 税率40%', () => {
      expect(calculateProgressiveTax(200, 10000)).toBe(80);
      expect(calculateProgressiveTax(200, 99999)).toBe(80);
    });

    it('配当が0なら税額0', () => {
      expect(calculateProgressiveTax(0, 50000)).toBe(0);
    });

    it('配当が負なら税額0', () => {
      expect(calculateProgressiveTax(-100, 50000)).toBe(0);
    });

    it('端数は切り捨て', () => {
      // 333 * 10% = 33.3 → 33
      expect(calculateProgressiveTax(333, 3000)).toBe(33);
    });

    it('寄付控除後の課税所得に税率が適用される', () => {
      // taxableIncome: calculateTaxableIncome(200, 60) = 140
      // totalAssets 3000以上: 10% → 14
      expect(
        calculateProgressiveTax(calculateTaxableIncome(200, 60), 3000),
      ).toBe(14);
    });
  });

  describe('calculatePublicFundRedistribution', () => {
    it('公共基金が閾値未満なら再分配なし', () => {
      expect(calculatePublicFundRedistribution(499)).toBe(0);
      expect(calculatePublicFundRedistribution(0)).toBe(0);
    });

    it('公共基金が閾値以上なら半額を再分配', () => {
      expect(calculatePublicFundRedistribution(500)).toBe(250);
      expect(calculatePublicFundRedistribution(1000)).toBe(500);
    });

    it('端数は切り捨て', () => {
      expect(calculatePublicFundRedistribution(501)).toBe(250);
    });
  });
});

import { describe, it, expect } from 'vitest';
import type { GameState } from '../types';
import {
  CREDIT_SCORE_INITIAL,
  CREDIT_SCORE_MIN,
  CREDIT_SCORE_MAX,
  CREDIT_SCORE_PAY_BONUS,
  CREDIT_SCORE_BANKRUPTCY_PENALTY,
  CREDIT_SCORE_PURCHASE_BLOCK_THRESHOLD,
  CREDIT_SCORE_EXPENSIVE_THRESHOLD,
  calculateCreditScoreDiscount,
  calculateCreditScoreOnPayment,
  calculateCreditScoreOnBankruptcy,
  isCreditScorePurchaseBlocked,
  isCreditScoreEnabled,
} from '../systems/credit';

const makeState = (
  creditScoreEnabled: boolean,
): Pick<GameState, 'features'> => ({
  features: { creditScore: creditScoreEnabled },
});

describe('credit', () => {
  describe('定数', () => {
    it('初期スコアは500', () => {
      expect(CREDIT_SCORE_INITIAL).toBe(500);
    });

    it('最小スコアは0、最大は850', () => {
      expect(CREDIT_SCORE_MIN).toBe(0);
      expect(CREDIT_SCORE_MAX).toBe(850);
    });

    it('支払いボーナスは+10', () => {
      expect(CREDIT_SCORE_PAY_BONUS).toBe(10);
    });

    it('破産ペナルティは-200', () => {
      expect(CREDIT_SCORE_BANKRUPTCY_PENALTY).toBe(200);
    });
  });

  describe('isCreditScoreEnabled', () => {
    it('features.creditScore=trueで有効', () => {
      expect(isCreditScoreEnabled(makeState(true) as GameState)).toBe(true);
    });

    it('features.creditScore=falseで無効', () => {
      expect(isCreditScoreEnabled(makeState(false) as GameState)).toBe(false);
    });

    it('featuresが未定義でも無効', () => {
      expect(isCreditScoreEnabled({} as GameState)).toBe(false);
    });
  });

  describe('calculateCreditScoreDiscount', () => {
    it('700以上: 金利-5%割引（-0.05）', () => {
      expect(calculateCreditScoreDiscount(700)).toBe(-0.05);
      expect(calculateCreditScoreDiscount(850)).toBe(-0.05);
    });

    it('600-699: 金利-2.5%割引（-0.025）', () => {
      expect(calculateCreditScoreDiscount(600)).toBe(-0.025);
      expect(calculateCreditScoreDiscount(699)).toBe(-0.025);
    });

    it('500-599: 割引なし（0）', () => {
      expect(calculateCreditScoreDiscount(500)).toBe(0);
      expect(calculateCreditScoreDiscount(599)).toBe(0);
    });

    it('400-499: 金利+2.5%加算（+0.025）', () => {
      expect(calculateCreditScoreDiscount(400)).toBe(0.025);
      expect(calculateCreditScoreDiscount(499)).toBe(0.025);
    });

    it('400未満: 金利+5%加算（+0.05）', () => {
      expect(calculateCreditScoreDiscount(399)).toBe(0.05);
      expect(calculateCreditScoreDiscount(0)).toBe(0.05);
    });
  });

  describe('calculateCreditScoreOnPayment', () => {
    it('支払いでスコアが+10される', () => {
      expect(calculateCreditScoreOnPayment(500)).toBe(510);
    });

    it('スコアが最大値(850)を超えない', () => {
      expect(calculateCreditScoreOnPayment(845)).toBe(850);
      expect(calculateCreditScoreOnPayment(850)).toBe(850);
    });
  });

  describe('calculateCreditScoreOnBankruptcy', () => {
    it('破産でスコアが-200される', () => {
      expect(calculateCreditScoreOnBankruptcy(500)).toBe(300);
    });

    it('スコアが最小値(0)を下回らない', () => {
      expect(calculateCreditScoreOnBankruptcy(100)).toBe(0);
      expect(calculateCreditScoreOnBankruptcy(0)).toBe(0);
    });
  });

  describe('isCreditScorePurchaseBlocked', () => {
    it(`スコアが閾値(${CREDIT_SCORE_PURCHASE_BLOCK_THRESHOLD})以上なら高額物件も購入可能`, () => {
      expect(
        isCreditScorePurchaseBlocked(
          CREDIT_SCORE_PURCHASE_BLOCK_THRESHOLD,
          CREDIT_SCORE_EXPENSIVE_THRESHOLD + 1,
        ),
      ).toBe(false);
    });

    it(`スコアが閾値未満かつ物件価格が高額閾値(${CREDIT_SCORE_EXPENSIVE_THRESHOLD})超で購入不可`, () => {
      expect(
        isCreditScorePurchaseBlocked(
          CREDIT_SCORE_PURCHASE_BLOCK_THRESHOLD - 1,
          CREDIT_SCORE_EXPENSIVE_THRESHOLD + 1,
        ),
      ).toBe(true);
    });

    it(`スコアが閾値未満でも物件価格が安ければ購入可能`, () => {
      expect(
        isCreditScorePurchaseBlocked(
          CREDIT_SCORE_PURCHASE_BLOCK_THRESHOLD - 1,
          CREDIT_SCORE_EXPENSIVE_THRESHOLD,
        ),
      ).toBe(false);
    });
  });
});

import { describe, it, expect } from 'vitest';
import type { EconomyStatus, GameState } from '../types';
import {
  LOAN_INTEREST_RATES,
  FIXED_LOAN_RATE,
  DEFAULT_LOAN_INTEREST_RATE,
  MAX_LOAN_TO_ASSET_RATIO,
  calculateInterest,
  calculateMaxLoanAmount,
  getLoanInterestRate,
  validateTakeLoan,
  validateRepayLoan,
  isLoanEnabled,
} from '../systems/loan';

const makeState = (overrides: Partial<GameState> = {}): GameState =>
  ({
    features: { loan: true },
    players: [
      {
        id: 'p1',
        name: 'Alice',
        token: '🚗',
        money: 1000,
        position: 0,
        properties: ['prop1'],
        inJail: false,
        jailTurns: 0,
        getOutOfJailCards: 0,
        isBankrupt: false,
        loanBalance: 0,
        creditScore: 500,
      },
    ],
    board: [
      {
        id: 'prop1',
        position: 1,
        type: 'property',
        name: 'Test Property',
        price: 200,
        mortgageValue: 100,
      },
    ],
    propertyStates: {
      prop1: { ownerId: 'p1', houses: 0, isMortgaged: false },
    },
    economyStatus: undefined,
    ...overrides,
  }) as unknown as GameState;

describe('loan', () => {
  describe('定数', () => {
    it('変動金利: 好況5%, 通常10%, 不況15%, 金融危機25%', () => {
      expect(LOAN_INTEREST_RATES.boom).toBe(0.05);
      expect(LOAN_INTEREST_RATES.normal).toBe(0.1);
      expect(LOAN_INTEREST_RATES.recession).toBe(0.15);
      expect(LOAN_INTEREST_RATES.crisis).toBe(0.25);
    });

    it('固定金利は12%', () => {
      expect(FIXED_LOAN_RATE).toBe(0.12);
    });

    it('デフォルト金利は10%', () => {
      expect(DEFAULT_LOAN_INTEREST_RATE).toBe(0.1);
    });

    it('借入上限比率は50%', () => {
      expect(MAX_LOAN_TO_ASSET_RATIO).toBe(0.5);
    });
  });

  describe('isLoanEnabled', () => {
    it('features.loan=trueで有効', () => {
      expect(isLoanEnabled(makeState())).toBe(true);
    });

    it('features.loan=falseで無効', () => {
      expect(isLoanEnabled(makeState({ features: { loan: false } }))).toBe(
        false,
      );
    });

    it('featuresが未定義でも無効', () => {
      expect(isLoanEnabled(makeState({ features: undefined }))).toBe(false);
    });
  });

  describe('calculateInterest', () => {
    it('元本×金利を切り捨て', () => {
      expect(calculateInterest(1000, 0.1)).toBe(100);
      expect(calculateInterest(1000, 0.15)).toBe(150);
    });

    it('元本が0なら0', () => {
      expect(calculateInterest(0, 0.1)).toBe(0);
    });

    it('金利が0なら0', () => {
      expect(calculateInterest(1000, 0)).toBe(0);
    });

    it('端数は切り捨て', () => {
      expect(calculateInterest(333, 0.1)).toBe(33);
    });
  });

  describe('calculateMaxLoanAmount', () => {
    it('総資産の50%がローン上限', () => {
      expect(calculateMaxLoanAmount(2000)).toBe(1000);
    });

    it('既存ローン分を差し引く', () => {
      expect(calculateMaxLoanAmount(2000, 400)).toBe(600);
    });

    it('既存ローンが上限を超えていたら0を返す', () => {
      expect(calculateMaxLoanAmount(1000, 600)).toBe(0);
    });

    it('総資産が0以下なら0', () => {
      expect(calculateMaxLoanAmount(0)).toBe(0);
      expect(calculateMaxLoanAmount(-100)).toBe(0);
    });
  });

  describe('getLoanInterestRate', () => {
    it('macroEconomy無効時はDEFAULT_LOAN_INTEREST_RATEを返す（変動）', () => {
      const state = makeState({ features: { loan: true } });
      const player = state.players[0];
      expect(getLoanInterestRate(state, player, 'variable')).toBe(
        DEFAULT_LOAN_INTEREST_RATE,
      );
    });

    it('固定金利タイプはFIXED_LOAN_RATEを返す（景気状態に依存しない）', () => {
      const state = makeState({
        features: { loan: true, macroEconomy: true },
        economyStatus: 'crisis',
      });
      const player = state.players[0];
      expect(getLoanInterestRate(state, player, 'fixed')).toBe(FIXED_LOAN_RATE);
    });

    it('macroEconomy有効・変動金利: 景気ステータスで金利が変わる', () => {
      const statuses: EconomyStatus[] = [
        'boom',
        'normal',
        'recession',
        'crisis',
      ];
      for (const status of statuses) {
        const state = makeState({
          features: { loan: true, macroEconomy: true },
          economyStatus: status,
        });
        const player = state.players[0];
        const expectedBase = LOAN_INTEREST_RATES[status];
        // creditScore=500（割引0）なので基本金利そのまま
        expect(getLoanInterestRate(state, player, 'variable')).toBe(
          expectedBase,
        );
      }
    });

    it('高信用スコア（700+）は変動金利に-5%割引が乗る', () => {
      const state = makeState({
        features: { loan: true, macroEconomy: true, creditScore: true },
        economyStatus: 'normal',
        players: [
          {
            id: 'p1',
            name: 'Alice',
            token: '🚗',
            money: 1000,
            position: 0,
            properties: [],
            inJail: false,
            jailTurns: 0,
            getOutOfJailCards: 0,
            isBankrupt: false,
            loanBalance: 0,
            creditScore: 750,
          },
        ],
      } as unknown as Partial<GameState>);
      const player = state.players[0];
      // normal=0.1 + discount(-0.05) = 0.05、ただし最低0
      expect(getLoanInterestRate(state, player, 'variable')).toBe(0.05);
    });

    it('低信用スコア（400未満）は変動金利に+5%加算される', () => {
      const state = makeState({
        features: { loan: true, macroEconomy: true, creditScore: true },
        economyStatus: 'normal',
        players: [
          {
            id: 'p1',
            name: 'Alice',
            token: '🚗',
            money: 1000,
            position: 0,
            properties: [],
            inJail: false,
            jailTurns: 0,
            getOutOfJailCards: 0,
            isBankrupt: false,
            loanBalance: 0,
            creditScore: 300,
          },
        ],
      } as unknown as Partial<GameState>);
      const player = state.players[0];
      // normal=0.1 + penalty(+0.05) = 0.15
      expect(getLoanInterestRate(state, player, 'variable')).toBe(0.15);
    });

    it('金利は最低0%にクランプされる', () => {
      const state = makeState({
        features: { loan: true, macroEconomy: true, creditScore: true },
        economyStatus: 'boom', // 0.05
        players: [
          {
            id: 'p1',
            name: 'Alice',
            token: '🚗',
            money: 1000,
            position: 0,
            properties: [],
            inJail: false,
            jailTurns: 0,
            getOutOfJailCards: 0,
            isBankrupt: false,
            loanBalance: 0,
            creditScore: 850, // -0.05割引
          },
        ],
      } as unknown as Partial<GameState>);
      const player = state.players[0];
      // boom=0.05 + discount(-0.05) = 0 → 0（負にはならない）
      expect(getLoanInterestRate(state, player, 'variable')).toBe(0);
    });
  });

  describe('validateTakeLoan', () => {
    it('正常: 借入可能', () => {
      const state = makeState();
      // 総資産: money(1000) + mortgageValue(100) = 1100
      // 借入上限: floor(1100 * 0.5) = 550
      expect(validateTakeLoan(state, 'p1', 500)).toEqual({
        ok: true,
      });
    });

    it('LOAN_DISABLED: loan機能が無効', () => {
      const state = makeState({ features: { loan: false } });
      expect(validateTakeLoan(state, 'p1', 100)).toEqual({
        ok: false,
        reason: 'LOAN_DISABLED',
      });
    });

    it('INVALID_AMOUNT: 金額が0以下', () => {
      const state = makeState();
      expect(validateTakeLoan(state, 'p1', 0)).toEqual({
        ok: false,
        reason: 'INVALID_AMOUNT',
      });
    });

    it('INVALID_AMOUNT: 金額が非整数', () => {
      const state = makeState();
      expect(validateTakeLoan(state, 'p1', 1.5)).toEqual({
        ok: false,
        reason: 'INVALID_AMOUNT',
      });
    });

    it('EXCEEDS_LIMIT: 借入上限超過', () => {
      const state = makeState();
      // 総資産1100、上限550
      expect(validateTakeLoan(state, 'p1', 600)).toEqual({
        ok: false,
        reason: 'EXCEEDS_LIMIT',
      });
    });

    it('PLAYER_NOT_FOUND: 存在しないプレイヤー', () => {
      const state = makeState();
      expect(validateTakeLoan(state, 'unknown', 100)).toEqual({
        ok: false,
        reason: 'PLAYER_NOT_FOUND',
      });
    });
  });

  describe('validateRepayLoan', () => {
    it('正常: 返済可能', () => {
      const state = makeState({
        players: [
          {
            id: 'p1',
            name: 'Alice',
            token: '🚗',
            money: 1000,
            position: 0,
            properties: [],
            inJail: false,
            jailTurns: 0,
            getOutOfJailCards: 0,
            isBankrupt: false,
            loanBalance: 500,
            creditScore: 500,
          },
        ],
      } as unknown as Partial<GameState>);
      expect(validateRepayLoan(state, 'p1', 300)).toEqual({ ok: true });
    });

    it('LOAN_DISABLED: loan機能が無効', () => {
      const state = makeState({ features: { loan: false } });
      expect(validateRepayLoan(state, 'p1', 100)).toEqual({
        ok: false,
        reason: 'LOAN_DISABLED',
      });
    });

    it('NO_LOAN: ローン残高がない', () => {
      const state = makeState();
      expect(validateRepayLoan(state, 'p1', 100)).toEqual({
        ok: false,
        reason: 'NO_LOAN',
      });
    });

    it('INSUFFICIENT_FUNDS: 現金不足', () => {
      const state = makeState({
        players: [
          {
            id: 'p1',
            name: 'Alice',
            token: '🚗',
            money: 50,
            position: 0,
            properties: [],
            inJail: false,
            jailTurns: 0,
            getOutOfJailCards: 0,
            isBankrupt: false,
            loanBalance: 500,
            creditScore: 500,
          },
        ],
      } as unknown as Partial<GameState>);
      expect(validateRepayLoan(state, 'p1', 100)).toEqual({
        ok: false,
        reason: 'INSUFFICIENT_FUNDS',
      });
    });
  });
});

import { describe, it, expect } from 'vitest';
import type { GameState } from '../types';
import { createInitialGameState, gameReducer } from '../reducer';
import {
  LOAN_INTEREST_RATES,
  DEFAULT_LOAN_INTEREST_RATE,
  MAX_LOAN_TO_ASSET_RATIO,
  calculateInterest,
  calculateMaxLoanAmount,
  isLoanEnabled,
  validateTakeLoan,
  validateRepayLoan,
} from '../systems/loan';

// ── テストヘルパー ──

function startGame(features?: {
  loan?: boolean;
  macroEconomy?: boolean;
}): GameState {
  return gameReducer(createInitialGameState(), {
    type: 'START_GAME',
    playerNames: ['たろう', 'はなこ'],
    playerTokens: ['🚗', '🎩'],
    features: features ?? {},
  });
}

// ── 定数 ──

describe('LOAN_INTEREST_RATES', () => {
  it('景気ステータスごとに金利が定義されている', () => {
    expect(LOAN_INTEREST_RATES.boom).toBeDefined();
    expect(LOAN_INTEREST_RATES.normal).toBeDefined();
    expect(LOAN_INTEREST_RATES.recession).toBeDefined();
    expect(LOAN_INTEREST_RATES.crisis).toBeDefined();
  });

  it('危機時の金利が通常より高い', () => {
    expect(LOAN_INTEREST_RATES.crisis).toBeGreaterThan(
      LOAN_INTEREST_RATES.normal,
    );
  });

  it('好況時の金利が通常より低くないか同等', () => {
    expect(LOAN_INTEREST_RATES.boom).toBeLessThanOrEqual(
      LOAN_INTEREST_RATES.normal,
    );
  });

  it('全ての金利は 0 以上 1 未満', () => {
    for (const rate of Object.values(LOAN_INTEREST_RATES)) {
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThan(1);
    }
  });
});

describe('MAX_LOAN_TO_ASSET_RATIO', () => {
  it('0より大きく1以下の値', () => {
    expect(MAX_LOAN_TO_ASSET_RATIO).toBeGreaterThan(0);
    expect(MAX_LOAN_TO_ASSET_RATIO).toBeLessThanOrEqual(1);
  });
});

// ── calculateInterest ──

describe('calculateInterest', () => {
  it('元本と金利から利息を計算する（切り捨て）', () => {
    // 1000 * 0.1 = 100
    expect(calculateInterest(1000, 0.1)).toBe(100);
  });

  it('端数は切り捨て', () => {
    // 101 * 0.1 = 10.1 → 10
    expect(calculateInterest(101, 0.1)).toBe(10);
  });

  it('元本0のとき利息は0', () => {
    expect(calculateInterest(0, 0.2)).toBe(0);
  });

  it('金利0のとき利息は0', () => {
    expect(calculateInterest(1000, 0)).toBe(0);
  });
});

// ── calculateMaxLoanAmount ──

describe('calculateMaxLoanAmount', () => {
  it('総資産に対して借入限度額を計算する', () => {
    const max = calculateMaxLoanAmount(2000);
    // 2000 * MAX_LOAN_TO_ASSET_RATIO以下
    expect(max).toBeLessThanOrEqual(Math.floor(2000 * MAX_LOAN_TO_ASSET_RATIO));
    expect(max).toBeGreaterThan(0);
  });

  it('既存ローン残高を差し引いた上限を返す', () => {
    const withoutLoan = calculateMaxLoanAmount(2000, 0);
    const withLoan = calculateMaxLoanAmount(2000, 200);
    expect(withLoan).toBeLessThan(withoutLoan);
  });

  it('既存ローンが上限に達している場合は0を返す', () => {
    const maxDebt = Math.floor(2000 * MAX_LOAN_TO_ASSET_RATIO);
    expect(calculateMaxLoanAmount(2000, maxDebt)).toBe(0);
  });

  it('総資産0のとき0を返す', () => {
    expect(calculateMaxLoanAmount(0)).toBe(0);
  });
});

// ── isLoanEnabled ──

describe('isLoanEnabled', () => {
  it('features.loanがtrueのとき有効', () => {
    const state = startGame({ loan: true });
    expect(isLoanEnabled(state)).toBe(true);
  });

  it('features.loanがfalseのとき無効', () => {
    const state = startGame({ loan: false });
    expect(isLoanEnabled(state)).toBe(false);
  });

  it('featuresが未定義のとき無効', () => {
    const state = startGame();
    expect(isLoanEnabled(state)).toBe(false);
  });
});

// ── validateTakeLoan ──

describe('validateTakeLoan', () => {
  it('ローン無効時はLOAN_DISABLED を返す', () => {
    const state = startGame({ loan: false });
    const result = validateTakeLoan(state, state.players[0].id, 100);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('LOAN_DISABLED');
  });

  it('借入額が0以下はINVALID_AMOUNT を返す', () => {
    const state = startGame({ loan: true });
    const result = validateTakeLoan(state, state.players[0].id, 0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('INVALID_AMOUNT');
  });

  it('借入限度額を超える場合はEXCEEDS_LIMIT を返す', () => {
    const state = startGame({ loan: true });
    // 初期資産1500、限度額 = floor(1500 * MAX_LOAN_TO_ASSET_RATIO)
    const limit = Math.floor(1500 * MAX_LOAN_TO_ASSET_RATIO);
    const result = validateTakeLoan(state, state.players[0].id, limit + 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('EXCEEDS_LIMIT');
  });

  it('有効な借入はok:trueを返す', () => {
    const state = startGame({ loan: true });
    const result = validateTakeLoan(state, state.players[0].id, 100);
    expect(result.ok).toBe(true);
  });
});

// ── validateRepayLoan ──

describe('validateRepayLoan', () => {
  it('ローン無効時はLOAN_DISABLED を返す', () => {
    const state = startGame({ loan: false });
    const result = validateRepayLoan(state, state.players[0].id, 100);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('LOAN_DISABLED');
  });

  it('返済額が0以下はINVALID_AMOUNT を返す', () => {
    const state = startGame({ loan: true });
    const result = validateRepayLoan(state, state.players[0].id, 0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('INVALID_AMOUNT');
  });

  it('ローン残高がない場合はNO_LOAN を返す', () => {
    const state = startGame({ loan: true });
    const result = validateRepayLoan(state, state.players[0].id, 100);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('NO_LOAN');
  });

  it('所持金が不足している場合はINSUFFICIENT_FUNDS を返す', () => {
    const state = startGame({ loan: true });
    // 借入後にお金を0にして返済を試みる
    const withLoan = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, money: 0, loanBalance: 500 } : p,
      ),
    };
    const result = validateRepayLoan(withLoan, withLoan.players[0].id, 100);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('INSUFFICIENT_FUNDS');
  });
});

// ── reducer統合: TAKE_LOAN / REPAY_LOAN アクション ──

describe('ローン統合テスト（reducer）', () => {
  it('TAKE_LOAN: プレイヤーの所持金が増加し、ローン残高が設定される', () => {
    const state = startGame({ loan: true });
    const after = gameReducer(state, {
      type: 'TAKE_LOAN',
      playerId: state.players[0].id,
      amount: 200,
    });
    expect(after.players[0].money).toBe(1500 + 200);
    expect(after.players[0].loanBalance).toBe(200);
  });

  it('REPAY_LOAN: プレイヤーの所持金が減少し、ローン残高が減る', () => {
    const state = startGame({ loan: true });
    const withLoan = gameReducer(state, {
      type: 'TAKE_LOAN',
      playerId: state.players[0].id,
      amount: 200,
    });
    const after = gameReducer(withLoan, {
      type: 'REPAY_LOAN',
      playerId: withLoan.players[0].id,
      amount: 100,
    });
    expect(after.players[0].money).toBe(1500 + 200 - 100);
    expect(after.players[0].loanBalance).toBe(100);
  });

  it('GOマス通過時にローン残高から利息が自動引落される', () => {
    const state = startGame({ loan: true });
    // 初期資産1500、上限=floor(1500*0.5)=750 なので500を借入
    const borrowAmount = 500;
    const withLoan = gameReducer(state, {
      type: 'TAKE_LOAN',
      playerId: state.players[0].id,
      amount: borrowAmount,
    });
    expect(withLoan.players[0].loanBalance).toBe(borrowAmount);
    // position=39 → FINISH_MOVING でGO通過
    const withPos = {
      ...withLoan,
      players: withLoan.players.map((p, i) =>
        i === 0 ? { ...p, position: 39 } : p,
      ),
      dice: { values: [1, 1] as [number, number], doubles: 0, rolled: true },
    };
    const after = gameReducer(withPos, { type: 'FINISH_MOVING' });
    // 社会配当150を受け取り、利息が自動引落される
    const interestExpected = calculateInterest(
      borrowAmount,
      DEFAULT_LOAN_INTEREST_RATE,
    );
    expect(after.players[0].money).toBe(
      1500 + borrowAmount + 150 - interestExpected,
    );
  });
});

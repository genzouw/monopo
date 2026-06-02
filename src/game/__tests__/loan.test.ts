import { describe, it, expect } from 'vitest';
import {
  BASE_RATE_INITIAL,
  BASE_RATE_MIN,
  BASE_RATE_MAX,
  LOAN_SPREAD,
  LOAN_PERIODS,
  calculateCreditScoreFactor,
  calculateLoanInterestRate,
  calculateMaxLoan,
  calculateMonthlyPayment,
  calculateNextBaseRate,
  liquidateNonPropertyAssets,
} from '../systems/loan';
import { createInitialGameState, gameReducer } from '../reducer';
import type { GameState } from '../types';

function startGame(features?: {
  loan?: boolean;
  altAssets?: boolean;
}): GameState {
  return gameReducer(createInitialGameState(), {
    type: 'START_GAME',
    playerNames: ['たろう', 'はなこ'],
    playerTokens: ['🚗', '🎩'],
    features,
  });
}

// ── クレジットスコアファクター ──

describe('calculateCreditScoreFactor', () => {
  it('所有25%未満でファクター1.5になる', () => {
    expect(calculateCreditScoreFactor(0)).toBe(1.5);
    expect(calculateCreditScoreFactor(0.1)).toBe(1.5);
    expect(calculateCreditScoreFactor(0.249)).toBe(1.5);
  });

  it('所有25〜50%でファクター1.0になる', () => {
    expect(calculateCreditScoreFactor(0.25)).toBe(1.0);
    expect(calculateCreditScoreFactor(0.4)).toBe(1.0);
    expect(calculateCreditScoreFactor(0.5)).toBe(1.0);
  });

  it('所有50%超でファクター0.7になる', () => {
    expect(calculateCreditScoreFactor(0.501)).toBe(0.7);
    expect(calculateCreditScoreFactor(1.0)).toBe(0.7);
  });
});

// ── 借入金利計算 ──

describe('calculateLoanInterestRate', () => {
  it('借入金利 = base_rate + spread * credit_score_factor', () => {
    // base=5%, spread=2%, factor=1.5 → 5%+3%=8%
    expect(calculateLoanInterestRate(0.05, 1.5)).toBeCloseTo(0.08);
    // base=5%, spread=2%, factor=1.0 → 5%+2%=7%
    expect(calculateLoanInterestRate(0.05, 1.0)).toBeCloseTo(0.07);
    // base=5%, spread=2%, factor=0.7 → 5%+1.4%=6.4%
    expect(calculateLoanInterestRate(0.05, 0.7)).toBeCloseTo(0.064);
  });
});

// ── 借入上限 ──

describe('calculateMaxLoan', () => {
  it('借入上限は総資産の50%（切り捨て）', () => {
    expect(calculateMaxLoan(1000)).toBe(500);
    expect(calculateMaxLoan(3000)).toBe(1500);
    expect(calculateMaxLoan(101)).toBe(50);
    expect(calculateMaxLoan(1500)).toBe(750);
  });
});

// ── 元利均等返済額 ──

describe('calculateMonthlyPayment', () => {
  it('元利均等返済額を正確に計算する', () => {
    // P=1000, r=7%, n=10: PMT ≈ 142 (切り上げ)
    const pmt = calculateMonthlyPayment(1000, 0.07, 10);
    expect(pmt).toBeGreaterThanOrEqual(142);
    expect(pmt).toBeLessThanOrEqual(145);
  });

  it('金利ゼロの場合は元本を均等分割する（切り上げ）', () => {
    expect(calculateMonthlyPayment(1000, 0, 10)).toBe(100);
    expect(calculateMonthlyPayment(1001, 0, 10)).toBe(101);
  });

  it('元本ゼロの場合は返済額ゼロ', () => {
    expect(calculateMonthlyPayment(0, 0.07, 10)).toBe(0);
  });
});

// ── 基準金利変動 ──

describe('calculateNextBaseRate', () => {
  it('5の倍数ターンでのみ変動する', () => {
    const rate = BASE_RATE_INITIAL;
    expect(calculateNextBaseRate(rate, 1)).toBe(rate);
    expect(calculateNextBaseRate(rate, 2)).toBe(rate);
    expect(calculateNextBaseRate(rate, 3)).toBe(rate);
    expect(calculateNextBaseRate(rate, 4)).toBe(rate);
    const newRate = calculateNextBaseRate(rate, 5);
    expect(newRate).not.toBe(rate);
  });

  it('変動後も1%〜30%の範囲に収まる', () => {
    let rate = BASE_RATE_INITIAL;
    for (let turn = 1; turn <= 100; turn++) {
      rate = calculateNextBaseRate(rate, turn);
      expect(rate).toBeGreaterThanOrEqual(BASE_RATE_MIN);
      expect(rate).toBeLessThanOrEqual(BASE_RATE_MAX);
    }
  });

  it('同じターン数・同じ金利では同じ結果になる（再現性）', () => {
    const r1 = calculateNextBaseRate(0.05, 5);
    const r2 = calculateNextBaseRate(0.05, 5);
    expect(r1).toBe(r2);
  });

  it('変動幅は±1〜3%', () => {
    const initial = 0.05;
    const newRate = calculateNextBaseRate(initial, 5);
    const diff = Math.abs(newRate - initial);
    expect(diff).toBeGreaterThanOrEqual(0.01 - 1e-10);
    expect(diff).toBeLessThanOrEqual(0.03 + 1e-10);
  });
});

// ── 破産時の非不動産資産清算（優先順位テスト） ──

describe('liquidateNonPropertyAssets', () => {
  const basePlayer = {
    id: 'player-0',
    name: 'たろう',
    token: '🚗' as const,
    money: 0,
    position: 0,
    properties: [] as string[],
    inJail: false,
    jailTurns: 0,
    getOutOfJailCards: 0,
    isBankrupt: false,
  };

  it('①暗号資産が清算される', () => {
    const player = {
      ...basePlayer,
      cryptoHolding: { units: 1.0, initialPrice: 1000, currentPrice: 1200 },
    };
    const { updatedPlayer, proceeds } = liquidateNonPropertyAssets(
      player,
      undefined,
    );
    expect(proceeds).toBe(1200);
    expect(updatedPlayer.cryptoHolding).toBeUndefined();
    expect(updatedPlayer.money).toBe(1200);
  });

  it('②VC投資が清算される（投資額を回収）', () => {
    const player = {
      ...basePlayer,
      vcInvestments: [
        { amount: 300, investedTurn: 0 },
        { amount: 200, investedTurn: 1 },
      ],
    };
    const { updatedPlayer, proceeds } = liquidateNonPropertyAssets(
      player,
      undefined,
    );
    expect(proceeds).toBe(500);
    expect(updatedPlayer.vcInvestments).toBeUndefined();
    expect(updatedPlayer.money).toBe(500);
  });

  it('③株式が市場価格で清算される', () => {
    const player = {
      ...basePlayer,
      stocks: { brown: 5 } as Record<string, number>,
    };
    const stockMarket = {
      brown: {
        color: 'brown' as const,
        pricePerShare: 100,
        totalShares: 100,
        bankShares: 95,
      },
    };
    const { updatedPlayer, proceeds } = liquidateNonPropertyAssets(
      player,
      stockMarket,
    );
    expect(proceeds).toBe(500);
    expect(updatedPlayer.stocks).toBeUndefined();
    expect(updatedPlayer.money).toBe(500);
  });

  it('清算後にすべての非不動産資産が削除される', () => {
    const player = {
      ...basePlayer,
      money: 100,
      cryptoHolding: { units: 1.0, initialPrice: 1000, currentPrice: 500 },
      vcInvestments: [{ amount: 200, investedTurn: 0 }],
    };
    const { updatedPlayer } = liquidateNonPropertyAssets(player, undefined);
    expect(updatedPlayer.cryptoHolding).toBeUndefined();
    expect(updatedPlayer.vcInvestments).toBeUndefined();
    expect(updatedPlayer.money).toBe(800); // 100 + 500 + 200
  });

  it('非不動産資産がなければ proceeds=0 を返す', () => {
    const { proceeds } = liquidateNonPropertyAssets(basePlayer, undefined);
    expect(proceeds).toBe(0);
  });
});

// ── Reducer 統合テスト: TAKE_LOAN ──

describe('reducer: TAKE_LOAN', () => {
  it('ローンを借り入れると資金が増えてLoanStateが設定される', () => {
    const state = startGame({ loan: true });
    const after = gameReducer(state, { type: 'TAKE_LOAN', amount: 500 });
    expect(after.players[0].money).toBe(2000); // 1500 + 500
    expect(after.players[0].loan).toBeDefined();
    expect(after.players[0].loan!.principal).toBe(500);
    expect(after.players[0].loan!.remainingPayments).toBe(LOAN_PERIODS);
  });

  it('loan機能がOFFならTAKE_LOANが無視される', () => {
    const state = startGame();
    const after = gameReducer(state, { type: 'TAKE_LOAN', amount: 500 });
    expect(after.players[0].loan).toBeUndefined();
    expect(after.players[0].money).toBe(1500);
  });

  it('借入上限（総資産の50%）を超える場合は無視される', () => {
    const state = startGame({ loan: true });
    // 初期資産 $1500 → 上限 $750
    const after = gameReducer(state, { type: 'TAKE_LOAN', amount: 10000 });
    expect(after.players[0].loan).toBeUndefined();
    expect(after.players[0].money).toBe(1500);
  });

  it('クレジットスコアに応じた借入金利が設定される（物件なし=最高金利）', () => {
    const state = startGame({ loan: true });
    // 物件なし → 所有率0% → factor=1.5 → rate = 5% + 2%×1.5 = 8%
    const after = gameReducer(state, { type: 'TAKE_LOAN', amount: 500 });
    expect(after.players[0].loan!.annualRate).toBeCloseTo(0.08);
  });

  it('既存ローンがある場合は追加借入できない', () => {
    const state = startGame({ loan: true });
    const withLoan = gameReducer(state, { type: 'TAKE_LOAN', amount: 300 });
    const again = gameReducer(withLoan, { type: 'TAKE_LOAN', amount: 200 });
    // ローン状態は変わらない
    expect(again.players[0].loan!.principal).toBe(300);
    expect(again.players[0].money).toBe(withLoan.players[0].money);
  });
});

// ── Reducer 統合テスト: REPAY_LOAN ──

describe('reducer: REPAY_LOAN', () => {
  it('REPAY_LOANで1回分の返済が行われる', () => {
    const state = startGame({ loan: true });
    const withLoan = gameReducer(state, { type: 'TAKE_LOAN', amount: 500 });
    const before = withLoan.players[0];
    const after = gameReducer(withLoan, { type: 'REPAY_LOAN' });
    const player = after.players[0];

    expect(player.money).toBeLessThan(before.money);
    expect(player.loan).toBeDefined();
    expect(player.loan!.remainingPayments).toBe(
      before.loan!.remainingPayments - 1,
    );
  });

  it('ローンがなければREPAY_LOANが無視される', () => {
    const state = startGame({ loan: true });
    const after = gameReducer(state, { type: 'REPAY_LOAN' });
    expect(after.players[0].money).toBe(1500);
  });

  it('loan機能がOFFならREPAY_LOANが無視される', () => {
    const state = startGame();
    const after = gameReducer(state, { type: 'REPAY_LOAN' });
    expect(after.players[0].money).toBe(1500);
  });
});

// ── Reducer 統合テスト: 変動金利が5ターンごとに変化する ──

describe('reducer: 変動金利が5ターンごとに変化する', () => {
  it('ゲーム開始時にbaseRateが初期値(5%)で設定される', () => {
    const state = startGame({ loan: true });
    expect(state.baseRate).toBe(BASE_RATE_INITIAL);
  });

  it('5ターン後にbaseRateが変動する', () => {
    let state = startGame({ loan: true });

    for (let i = 0; i < 5; i++) {
      state = gameReducer(state, { type: 'END_TURN' });
    }

    const expectedRate = calculateNextBaseRate(BASE_RATE_INITIAL, 5);
    expect(state.baseRate).toBeCloseTo(expectedRate);
    expect(state.baseRate).not.toBe(BASE_RATE_INITIAL);
  });

  it('5の倍数でないターンはbaseRateが変動しない', () => {
    let state = startGame({ loan: true });
    const initialRate = state.baseRate!;

    for (let i = 0; i < 4; i++) {
      state = gameReducer(state, { type: 'END_TURN' });
    }

    expect(state.baseRate).toBe(initialRate);
  });
});

// ── Reducer 統合テスト: END_TURNでローン返済が自動実行される ──

describe('reducer: END_TURNで現在プレイヤーのローンが自動返済される', () => {
  it('END_TURN後に残返済回数が1減る', () => {
    let state = startGame({ loan: true });
    state = gameReducer(state, { type: 'TAKE_LOAN', amount: 500 });
    const loanBefore = state.players[0].loan!;

    state = gameReducer(state, { type: 'END_TURN' });

    const player0 = state.players.find((p) => p.id === 'player-0')!;
    expect(player0.loan).toBeDefined();
    expect(player0.loan!.remainingPayments).toBe(
      loanBefore.remainingPayments - 1,
    );
  });

  it('返済完了後にloanがundefinedになる', () => {
    let state = startGame({ loan: true });
    state = gameReducer(state, { type: 'TAKE_LOAN', amount: 100 });

    // LOAN_PERIODS 回 END_TURN（2プレイヤーなのでプレイヤー0は LOAN_PERIODS * 2 回分）
    for (let i = 0; i < LOAN_PERIODS * 2; i++) {
      state = gameReducer(state, { type: 'END_TURN' });
    }

    const player0 = state.players.find((p) => p.id === 'player-0')!;
    expect(player0.loan).toBeUndefined();
  });
});

// ── 定数の確認 ──

describe('loan 定数', () => {
  it('基準金利の初期値は5%', () => {
    expect(BASE_RATE_INITIAL).toBeCloseTo(0.05);
  });

  it('基準金利の下限は1%', () => {
    expect(BASE_RATE_MIN).toBeCloseTo(0.01);
  });

  it('基準金利の上限は30%', () => {
    expect(BASE_RATE_MAX).toBeCloseTo(0.3);
  });

  it('スプレッドは2%', () => {
    expect(LOAN_SPREAD).toBeCloseTo(0.02);
  });

  it('返済回数は10回', () => {
    expect(LOAN_PERIODS).toBe(10);
  });
});

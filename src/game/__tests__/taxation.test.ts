import { describe, it, expect } from 'vitest';
import type { GameState } from '../types';
import { createInitialGameState, gameReducer } from '../reducer';
import {
  PROGRESSIVE_TAX_BRACKETS,
  PUBLIC_FUND_REDISTRIBUTION_THRESHOLD,
  calculateProgressiveTax,
  calculatePublicFundRedistribution,
  isProgressiveTaxEnabled,
} from '../systems/taxation';

// ── テストヘルパー ──

function startGame(features?: { progressiveTax?: boolean }): GameState {
  return gameReducer(createInitialGameState(), {
    type: 'START_GAME',
    playerNames: ['たろう', 'はなこ'],
    playerTokens: ['🚗', '🎩'],
    features: features ?? {},
  });
}

// ── 定数 ──

describe('PROGRESSIVE_TAX_BRACKETS', () => {
  it('4段階のブラケットが定義されている', () => {
    expect(PROGRESSIVE_TAX_BRACKETS).toHaveLength(4);
  });

  it('最初のブラケットは資産3000未満で税率0', () => {
    expect(PROGRESSIVE_TAX_BRACKETS[0]).toMatchObject({
      threshold: 3000,
      rate: 0,
    });
  });

  it('最後のブラケットはInfinityで税率40%', () => {
    const last = PROGRESSIVE_TAX_BRACKETS[PROGRESSIVE_TAX_BRACKETS.length - 1];
    expect(last.threshold).toBe(Infinity);
    expect(last.rate).toBe(0.4);
  });

  it('thresholdは昇順になっている', () => {
    for (let i = 1; i < PROGRESSIVE_TAX_BRACKETS.length; i++) {
      expect(PROGRESSIVE_TAX_BRACKETS[i].threshold).toBeGreaterThan(
        PROGRESSIVE_TAX_BRACKETS[i - 1].threshold,
      );
    }
  });
});

// ── calculateProgressiveTax ──

describe('calculateProgressiveTax', () => {
  it('総資産3000未満は税額0', () => {
    expect(calculateProgressiveTax(150, 2999)).toBe(0);
    expect(calculateProgressiveTax(150, 0)).toBe(0);
  });

  it('総資産3000以上6000未満は10%', () => {
    // 社会配当150, 資産4000 → 税額 = floor(150 * 0.1) = 15
    expect(calculateProgressiveTax(150, 4000)).toBe(15);
    expect(calculateProgressiveTax(150, 3000)).toBe(15);
  });

  it('総資産6000以上10000未満は25%', () => {
    // 社会配当150, 資産7000 → 税額 = floor(150 * 0.25) = 37
    expect(calculateProgressiveTax(150, 7000)).toBe(37);
  });

  it('総資産10000以上は40%', () => {
    // 社会配当150, 資産12000 → 税額 = floor(150 * 0.4) = 60
    expect(calculateProgressiveTax(150, 12000)).toBe(60);
  });

  it('社会配当が0のとき税額は0', () => {
    expect(calculateProgressiveTax(0, 15000)).toBe(0);
  });

  it('税額は切り捨て（floor）される', () => {
    // 社会配当100, 資産4000 → 100 * 0.1 = 10.0 → 10
    expect(calculateProgressiveTax(100, 4000)).toBe(10);
    // 社会配当101, 資産4000 → 101 * 0.1 = 10.1 → 10
    expect(calculateProgressiveTax(101, 4000)).toBe(10);
  });

  it('税額は社会配当を超えない', () => {
    const dividend = 50;
    const tax = calculateProgressiveTax(dividend, 20000);
    expect(tax).toBeLessThanOrEqual(dividend);
  });
});

// ── calculatePublicFundRedistribution ──

describe('calculatePublicFundRedistribution', () => {
  it('公共基金が閾値未満は0を返す', () => {
    expect(
      calculatePublicFundRedistribution(
        PUBLIC_FUND_REDISTRIBUTION_THRESHOLD - 1,
      ),
    ).toBe(0);
  });

  it('公共基金が閾値以上なら再分配額を返す', () => {
    const result = calculatePublicFundRedistribution(
      PUBLIC_FUND_REDISTRIBUTION_THRESHOLD,
    );
    expect(result).toBeGreaterThan(0);
  });

  it('再分配額は公共基金を超えない', () => {
    const fund = 600;
    const result = calculatePublicFundRedistribution(fund);
    expect(result).toBeLessThanOrEqual(fund);
  });
});

// ── isProgressiveTaxEnabled ──

describe('isProgressiveTaxEnabled', () => {
  it('features.progressiveTaxがtrueのとき有効', () => {
    const state = startGame({ progressiveTax: true });
    expect(isProgressiveTaxEnabled(state)).toBe(true);
  });

  it('features.progressiveTaxがfalseのとき無効', () => {
    const state = startGame({ progressiveTax: false });
    expect(isProgressiveTaxEnabled(state)).toBe(false);
  });

  it('featuresが未定義のとき無効', () => {
    const state = startGame();
    expect(isProgressiveTaxEnabled(state)).toBe(false);
  });
});

// ── reducer統合: 累進課税によるGO通過ボーナス変化 ──

describe('累進課税統合テスト（reducer）', () => {
  function moveToGo(state: GameState): GameState {
    // position=39 → FINISH_MOVING でGOを通過させる
    const withPos = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, position: 39 } : p,
      ),
      dice: { values: [1, 1] as [number, number], doubles: 0, rolled: true },
    };
    return gameReducer(withPos, { type: 'FINISH_MOVING' });
  }

  it('progressiveTax OFF: 資産が多くても一定額の社会配当を受け取る', () => {
    const state = startGame({ progressiveTax: false });
    const richState = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, money: 15000 } : p,
      ),
    };
    const before = richState.players[0].money;
    const after = moveToGo(richState).players[0].money;
    // 資産多くても通常配当（150）もらえる
    expect(after - before).toBeGreaterThanOrEqual(150);
  });

  it('progressiveTax ON: 資産が少ない（3000未満）プレイヤーは税額0', () => {
    const state = startGame({ progressiveTax: true });
    // 初期資産1500 → 3000未満なので税率0
    const before = state.players[0].money;
    const after = moveToGo(state).players[0].money;
    expect(after - before).toBeGreaterThanOrEqual(150);
  });

  it('progressiveTax ON: 資産が多い（10000超）プレイヤーは40%課税される', () => {
    const state = startGame({ progressiveTax: true });
    const richState = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, money: 15000 } : p,
      ),
    };
    const before = richState.players[0].money;
    const after = moveToGo(richState).players[0].money;
    // macroEconomy OFFなので基準配当=150, 税=floor(150*0.4)=60, 手取り=90
    expect(after - before).toBeGreaterThanOrEqual(88);
    expect(after - before).toBeLessThan(150);
  });

  it('progressiveTax ON: 徴収された税は公共基金に蓄積される', () => {
    const state = startGame({ progressiveTax: true });
    const richState = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, money: 15000 } : p,
      ),
    };
    const after = moveToGo(richState);
    // 税金がpublicFundに蓄積されている
    expect(after.publicFund).toBeGreaterThan(0);
  });
});

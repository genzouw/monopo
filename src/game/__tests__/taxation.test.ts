import { describe, it, expect } from 'vitest';
import type { GameState } from '../types';
import { createInitialGameState, gameReducer } from '../reducer';
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

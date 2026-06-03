import { describe, it, expect } from 'vitest';
import type { GameState } from '../types';
import { createInitialGameState, gameReducer } from '../reducer';
import {
  INSURANCE_PREMIUM_RATE,
  calculateInsurancePremium,
  isInsuranceEnabled,
  validateBuyInsurance,
} from '../systems/insurance';

// ── テストヘルパー ──

function startGame(features?: { insurance?: boolean }): GameState {
  return gameReducer(createInitialGameState(), {
    type: 'START_GAME',
    playerNames: ['たろう', 'はなこ'],
    playerTokens: ['🚗', '🎩'],
    features: features ?? {},
  });
}

// ── 定数 ──

describe('INSURANCE_PREMIUM_RATE', () => {
  it('0より大きく1未満の値', () => {
    expect(INSURANCE_PREMIUM_RATE).toBeGreaterThan(0);
    expect(INSURANCE_PREMIUM_RATE).toBeLessThan(1);
  });
});

// ── calculateInsurancePremium ──

describe('calculateInsurancePremium', () => {
  it('物件価格に対する保険料を計算する（切り捨て）', () => {
    // price=200, rate=0.05 → 10
    const premium = calculateInsurancePremium(200);
    expect(premium).toBeGreaterThan(0);
    expect(premium).toBeLessThan(200);
  });

  it('物件価格0のとき保険料は0', () => {
    expect(calculateInsurancePremium(0)).toBe(0);
  });

  it('保険料は物件価格を超えない', () => {
    expect(calculateInsurancePremium(100)).toBeLessThanOrEqual(100);
  });
});

// ── isInsuranceEnabled ──

describe('isInsuranceEnabled', () => {
  it('features.insuranceがtrueのとき有効', () => {
    const state = startGame({ insurance: true });
    expect(isInsuranceEnabled(state)).toBe(true);
  });

  it('features.insuranceがfalseのとき無効', () => {
    const state = startGame({ insurance: false });
    expect(isInsuranceEnabled(state)).toBe(false);
  });

  it('featuresが未定義のとき無効', () => {
    const state = startGame();
    expect(isInsuranceEnabled(state)).toBe(false);
  });
});

// ── validateBuyInsurance ──

describe('validateBuyInsurance', () => {
  it('insurance無効時はINSURANCE_DISABLEDを返す', () => {
    const state = startGame({ insurance: false });
    // 物件を所有していると仮定した状態
    const stateWithProp = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, properties: ['prop-brown-1'] } : p,
      ),
    };
    const result = validateBuyInsurance(
      stateWithProp,
      stateWithProp.players[0].id,
      'prop-brown-1',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('INSURANCE_DISABLED');
  });

  it('物件を所有していない場合はNOT_OWNERを返す', () => {
    const state = startGame({ insurance: true });
    const result = validateBuyInsurance(
      state,
      state.players[0].id,
      'prop-brown-1',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('NOT_OWNER');
  });

  it('残金不足の場合はINSUFFICIENT_FUNDSを返す', () => {
    const state = startGame({ insurance: true });
    // ボード上の実在する物件IDを使用
    const propId = state.board.find((s) => s.type === 'property')!.id;
    const stateWithPropNoMoney = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, money: 0, properties: [propId] } : p,
      ),
    };
    const result = validateBuyInsurance(
      stateWithPropNoMoney,
      stateWithPropNoMoney.players[0].id,
      propId,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('INSUFFICIENT_FUNDS');
  });
});

// ── reducer統合: BUY_INSURANCE / ブラックスワンイベント ──

describe('保険統合テスト（reducer）', () => {
  it('BUY_INSURANCE: 保険料が引落され、物件に保険フラグが付く', () => {
    const state = startGame({ insurance: true });
    // 物件を所持させる（board上のbrown物件を仮定）
    const propId = state.board.find((s) => s.type === 'property')!.id;
    const stateWithProp = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, properties: [propId] } : p,
      ),
      propertyStates: {
        ...state.propertyStates,
        [propId]: {
          ownerId: state.players[0].id,
          houses: 0,
          isMortgaged: false,
        },
      },
    };
    const space = state.board.find((s) => s.id === propId)!;
    const premium = calculateInsurancePremium(space.price ?? 0);
    const moneyBefore = stateWithProp.players[0].money;

    const after = gameReducer(stateWithProp, {
      type: 'BUY_INSURANCE',
      playerId: stateWithProp.players[0].id,
      propertyId: propId,
    });
    expect(after.players[0].money).toBe(moneyBefore - premium);
    expect(after.propertyStates[propId].isInsured).toBe(true);
  });

  it('blackSwanDisasterカード: 未保険物件は家が1つ失われる', () => {
    const state = startGame({ insurance: true });
    const propId = state.board.find(
      (s) => s.type === 'property' && s.color === 'brown',
    )!.id;
    const stateWithHouse = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, properties: [propId] } : p,
      ),
      propertyStates: {
        ...state.propertyStates,
        [propId]: {
          ownerId: state.players[0].id,
          houses: 2,
          isMortgaged: false,
        },
      },
      currentCard: {
        id: 'disaster-test',
        type: 'chance' as const,
        text: '火災が発生！',
        action: {
          type: 'blackSwanDisaster' as const,
          colorGroup: 'brown' as const,
        },
      },
    };
    const after = gameReducer(stateWithHouse, { type: 'DISMISS_CARD' });
    // 保険なし → 家が1つ減る
    expect(after.propertyStates[propId].houses).toBe(1);
  });

  it('blackSwanDisasterカード: 保険あり物件は家が失われない', () => {
    const state = startGame({ insurance: true });
    const propId = state.board.find(
      (s) => s.type === 'property' && s.color === 'brown',
    )!.id;
    const stateWithInsurance = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, properties: [propId] } : p,
      ),
      propertyStates: {
        ...state.propertyStates,
        [propId]: {
          ownerId: state.players[0].id,
          houses: 2,
          isMortgaged: false,
          isInsured: true,
        },
      },
      currentCard: {
        id: 'disaster-test',
        type: 'chance' as const,
        text: '火災が発生！',
        action: {
          type: 'blackSwanDisaster' as const,
          colorGroup: 'brown' as const,
        },
      },
    };
    const after = gameReducer(stateWithInsurance, { type: 'DISMISS_CARD' });
    // 保険あり → 家は失われないが保険フラグはリセット（掛け捨て）
    expect(after.propertyStates[propId].houses).toBe(2);
    expect(after.propertyStates[propId].isInsured).toBe(false);
  });
});

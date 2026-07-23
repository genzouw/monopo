import { describe, it, expect, vi, afterEach } from 'vitest';
import * as randomModule from '../random';
import { createInitialGameState, gameReducer } from '../reducer';
import {
  FIRE_PROBABILITY,
  FIRE_SCRAP_RATE,
  INSURANCE_COLLECT_INTERVAL,
  INSURANCE_RATE,
  calculateFirePayout,
  calculatePremium,
  isInsuranceEnabled,
  isPropertyInsured,
  shouldCollectPremium,
} from '../insurance';
import {
  INSURANCE_PREMIUM_RATE,
  calculateInsurancePremium,
  validateBuyInsurance,
} from '../systems/insurance';
import type { GameState } from '../types';

function startGame(features?: { insurance?: boolean }): GameState {
  return gameReducer(createInitialGameState(), {
    type: 'START_GAME',
    playerNames: ['たろう', 'はなこ'],
    playerTokens: ['🚗', '🎩'],
    features,
  });
}

// ── 純粋関数のテスト ──

describe('insurance.ts 純粋関数', () => {
  describe('定数', () => {
    it('INSURANCE_RATE は 0.03', () => {
      expect(INSURANCE_RATE).toBe(0.03);
    });
    it('FIRE_PROBABILITY は 0.02', () => {
      expect(FIRE_PROBABILITY).toBe(0.02);
    });
    it('FIRE_SCRAP_RATE は 0.20', () => {
      expect(FIRE_SCRAP_RATE).toBe(0.2);
    });
    it('INSURANCE_COLLECT_INTERVAL は 10', () => {
      expect(INSURANCE_COLLECT_INTERVAL).toBe(10);
    });
  });

  describe('calculatePremium', () => {
    it('評価額 200 の3%は 6', () => {
      expect(calculatePremium(200)).toBe(6);
    });
    it('評価額 0 は 0', () => {
      expect(calculatePremium(0)).toBe(0);
    });
    it('端数は切り捨て（評価額 333 → floor(9.99) = 9）', () => {
      expect(calculatePremium(333)).toBe(9);
    });
  });

  describe('shouldCollectPremium', () => {
    it('turnCount=0 は徴収しない', () => {
      expect(shouldCollectPremium(0)).toBe(false);
    });
    it('turnCount=10 は徴収する', () => {
      expect(shouldCollectPremium(10)).toBe(true);
    });
    it('turnCount=20 は徴収する', () => {
      expect(shouldCollectPremium(20)).toBe(true);
    });
    it('turnCount=5 は徴収しない', () => {
      expect(shouldCollectPremium(5)).toBe(false);
    });
    it('turnCount=11 は徴収しない', () => {
      expect(shouldCollectPremium(11)).toBe(false);
    });
  });

  describe('calculateFirePayout', () => {
    it('保険あり: 評価額100%を返す', () => {
      expect(calculateFirePayout(200, true)).toBe(200);
    });
    it('保険なし: 評価額の20%（スクラップ）を返す', () => {
      expect(calculateFirePayout(200, false)).toBe(40);
    });
    it('保険なし: 端数切り捨て（評価額 333 → floor(66.6) = 66）', () => {
      expect(calculateFirePayout(333, false)).toBe(66);
    });
  });

  describe('isPropertyInsured', () => {
    it('undefined の insuranceState では false', () => {
      expect(isPropertyInsured(undefined, 'prop-1')).toBe(false);
    });
    it('加入済みは true', () => {
      expect(isPropertyInsured({ 'prop-1': true }, 'prop-1')).toBe(true);
    });
    it('未加入は false', () => {
      expect(isPropertyInsured({ 'prop-1': true }, 'prop-2')).toBe(false);
    });
  });

  describe('isInsuranceEnabled', () => {
    it('features.insurance=true のとき有効', () => {
      const state = startGame({ insurance: true });
      expect(isInsuranceEnabled(state)).toBe(true);
    });
    it('features.insurance=false のとき無効', () => {
      const state = startGame({ insurance: false });
      expect(isInsuranceEnabled(state)).toBe(false);
    });
    it('features が未定義のとき無効', () => {
      const state = startGame();
      expect(isInsuranceEnabled(state)).toBe(false);
    });
  });
});

// ── systems/insurance 固有の純粋関数 ──

describe('INSURANCE_PREMIUM_RATE', () => {
  it('0より大きく1未満の値', () => {
    expect(INSURANCE_PREMIUM_RATE).toBeGreaterThan(0);
    expect(INSURANCE_PREMIUM_RATE).toBeLessThan(1);
  });
});

describe('calculateInsurancePremium', () => {
  it('物件価格に対する保険料を計算する（切り捨て）', () => {
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

describe('validateBuyInsurance', () => {
  it('insurance無効時はINSURANCE_DISABLEDを返す', () => {
    const state = startGame({ insurance: false });
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

// ── Reducer 統合テスト ──

describe('reducer 保険統合', () => {
  describe('START_GAME', () => {
    it('insurance=true で insuranceState が {} に初期化される', () => {
      const state = startGame({ insurance: true });
      expect(state.insuranceState).toEqual({});
    });
    it('insurance=false で insuranceState が undefined', () => {
      const state = startGame({ insurance: false });
      expect(state.insuranceState).toBeUndefined();
    });
    it('turnCount=0 で初期化される', () => {
      const state = startGame({ insurance: true });
      expect(state.turnCount).toBe(0);
    });
  });

  describe('BUY_INSURANCE / CANCEL_INSURANCE', () => {
    function buyProperty(state: GameState): GameState {
      const withPosition = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0 ? { ...p, position: 1 } : p,
        ),
      };
      return gameReducer(withPosition, { type: 'BUY_PROPERTY' });
    }

    it('insurance OFF のとき BUY_INSURANCE は無視される', () => {
      let state = startGame({ insurance: false });
      state = buyProperty(state);
      const propId = state.players[0].properties[0];
      const before = state.players[0].money;
      state = gameReducer(state, { type: 'BUY_INSURANCE', propertyId: propId });
      expect(state.players[0].money).toBe(before);
      expect(state.insuranceState).toBeUndefined();
    });

    it('保険加入で保険料が引かれ insuranceState に登録される', () => {
      let state = startGame({ insurance: true });
      state = buyProperty(state);
      const propId = state.players[0].properties[0];
      const space = state.board.find((s) => s.id === propId)!;
      const expectedPremium = Math.floor((space.price ?? 0) * INSURANCE_RATE);
      const moneyBefore = state.players[0].money;
      state = gameReducer(state, { type: 'BUY_INSURANCE', propertyId: propId });
      expect(state.players[0].money).toBe(moneyBefore - expectedPremium);
      expect(state.insuranceState?.[propId]).toBe(true);
    });

    it('すでに加入済みの物件に再度 BUY_INSURANCE しても変化なし', () => {
      let state = startGame({ insurance: true });
      state = buyProperty(state);
      const propId = state.players[0].properties[0];
      state = gameReducer(state, { type: 'BUY_INSURANCE', propertyId: propId });
      const moneyAfterFirst = state.players[0].money;
      state = gameReducer(state, { type: 'BUY_INSURANCE', propertyId: propId });
      expect(state.players[0].money).toBe(moneyAfterFirst);
    });

    it('CANCEL_INSURANCE で insuranceState から削除される', () => {
      let state = startGame({ insurance: true });
      state = buyProperty(state);
      const propId = state.players[0].properties[0];
      state = gameReducer(state, { type: 'BUY_INSURANCE', propertyId: propId });
      expect(state.insuranceState?.[propId]).toBe(true);
      state = gameReducer(state, {
        type: 'CANCEL_INSURANCE',
        propertyId: propId,
      });
      expect(state.insuranceState?.[propId]).toBeUndefined();
    });

    it('自分が所有していない物件の保険加入はできない', () => {
      let state = startGame({ insurance: true });
      state = buyProperty(state);
      const propId = state.players[0].properties[0];
      const stateWithP2Turn = {
        ...state,
        currentPlayerIndex: 1,
      };
      const moneyBefore = stateWithP2Turn.players[1].money;
      const after = gameReducer(stateWithP2Turn, {
        type: 'BUY_INSURANCE',
        propertyId: propId,
      });
      expect(after.players[1].money).toBe(moneyBefore);
      expect(after.insuranceState?.[propId]).toBeUndefined();
    });

    it('火災リスクのない鉄道（railroad）には保険加入できない', () => {
      let state = startGame({ insurance: true });
      state = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0 ? { ...p, position: 5 } : p,
        ),
      };
      state = gameReducer(state, { type: 'BUY_PROPERTY' });
      const propId = state.players[0].properties[0];
      const moneyBefore = state.players[0].money;
      const after = gameReducer(state, {
        type: 'BUY_INSURANCE',
        propertyId: propId,
      });
      expect(after.players[0].money).toBe(moneyBefore);
      expect(after.insuranceState?.[propId]).toBeUndefined();
    });

    it('火災リスクのない公共施設（utility）には保険加入できない', () => {
      let state = startGame({ insurance: true });
      state = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0 ? { ...p, position: 12 } : p,
        ),
      };
      state = gameReducer(state, { type: 'BUY_PROPERTY' });
      const propId = state.players[0].properties[0];
      const moneyBefore = state.players[0].money;
      const after = gameReducer(state, {
        type: 'BUY_INSURANCE',
        propertyId: propId,
      });
      expect(after.players[0].money).toBe(moneyBefore);
      expect(after.insuranceState?.[propId]).toBeUndefined();
    });
  });

  describe('END_TURN: turnCount インクリメント', () => {
    it('END_TURN のたびに turnCount が +1 される', () => {
      let state = startGame({ insurance: true });
      expect(state.turnCount).toBe(0);
      state = { ...state, dice: { values: [1, 2], doubles: 0, rolled: true } };
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.turnCount).toBe(1);
      state = { ...state, dice: { values: [1, 2], doubles: 0, rolled: true } };
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.turnCount).toBe(2);
    });

    it('insurance=false でも turnCount は増加する（フラグと独立）', () => {
      let state = startGame();
      state = { ...state, dice: { values: [1, 2], doubles: 0, rolled: true } };
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.turnCount).toBe(1);
    });
  });

  describe('END_TURN: 火災発生シナリオ', () => {
    afterEach(() => vi.restoreAllMocks());

    function buyPropertyForPlayer(state: GameState): {
      state: GameState;
      propId: string;
    } {
      const withPosition = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0 ? { ...p, position: 1 } : p,
        ),
      };
      const afterBuy = gameReducer(withPosition, { type: 'BUY_PROPERTY' });
      return { state: afterBuy, propId: afterBuy.players[0].properties[0] };
    }

    it('END_TURN 時に火災が発生し物件が消滅する（保険あり）', () => {
      vi.spyOn(randomModule, 'getSecureRandomInt').mockReturnValue(1);
      let state = startGame({ insurance: true });
      const { state: withProp, propId } = buyPropertyForPlayer(state);
      state = gameReducer(withProp, {
        type: 'BUY_INSURANCE',
        propertyId: propId,
      });
      const moneyBefore = state.players[0].money;
      const space = state.board.find((s) => s.id === propId)!;
      state = { ...state, dice: { values: [1, 2], doubles: 0, rolled: true } };
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.players[0].properties).not.toContain(propId);
      expect(state.players[0].money).toBe(moneyBefore + (space.price ?? 0));
      expect(state.insuranceState?.[propId]).toBeUndefined();
    });

    it('END_TURN 時に火災が発生し物件が消滅する（保険なし）', () => {
      vi.spyOn(randomModule, 'getSecureRandomInt').mockReturnValue(1);
      let state = startGame({ insurance: true });
      const { state: withProp, propId } = buyPropertyForPlayer(state);
      const moneyBefore = withProp.players[0].money;
      const space = withProp.board.find((s) => s.id === propId)!;
      const scrapValue = Math.floor((space.price ?? 0) * FIRE_SCRAP_RATE);
      state = {
        ...withProp,
        dice: { values: [1, 2], doubles: 0, rolled: true },
      };
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.players[0].properties).not.toContain(propId);
      expect(state.players[0].money).toBe(moneyBefore + scrapValue);
    });

    it('火災発生時は火災メッセージがターン告知に上書きされず表示される', () => {
      vi.spyOn(randomModule, 'getSecureRandomInt').mockReturnValue(1);
      let state = startGame({ insurance: true });
      const { state: withProp, propId } = buyPropertyForPlayer(state);
      const space = withProp.board.find((s) => s.id === propId)!;
      state = {
        ...withProp,
        dice: { values: [1, 2], doubles: 0, rolled: true },
      };
      state = gameReducer(state, { type: 'END_TURN' });
      // 火災で物件が消滅したことがプレイヤーに通知される
      expect(state.message).toContain('火災');
      expect(state.message).toContain(space.name);
      // 次のプレイヤーへのターン告知も併記される
      expect(state.message).toContain('はなこのばんだよ');
    });

    it('火災が発生しなければ従来どおりターン告知のみ表示される', () => {
      vi.spyOn(randomModule, 'getSecureRandomInt').mockReturnValue(99);
      let state = startGame({ insurance: true });
      const { state: withProp } = buyPropertyForPlayer(state);
      state = {
        ...withProp,
        dice: { values: [1, 2], doubles: 0, rolled: true },
      };
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.message).toBe('はなこのばんだよ！サイコロをふろう！');
    });

    it('保険料残高不足時に保険が全解除されマイナス残高にならない', () => {
      vi.spyOn(randomModule, 'getSecureRandomInt').mockReturnValue(99);
      let state = startGame({ insurance: true });
      const { state: withProp, propId } = buyPropertyForPlayer(state);
      state = gameReducer(withProp, {
        type: 'BUY_INSURANCE',
        propertyId: propId,
      });
      state = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0 ? { ...p, money: 0 } : p,
        ),
        turnCount: 9,
      };
      state = { ...state, dice: { values: [1, 2], doubles: 0, rolled: true } };
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.insuranceState?.[propId]).toBeUndefined();
      expect(state.players[0].money).toBeGreaterThanOrEqual(0);
    });
  });

  describe('blackSwanDisaster カード', () => {
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
      expect(after.propertyStates[propId].houses).toBe(2);
      expect(after.propertyStates[propId].isInsured).toBe(false);
    });
  });
});

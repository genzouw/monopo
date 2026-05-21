import { describe, it, expect } from 'vitest';
import { BOARD_SPACES, createPropertyStates } from '../board';

describe('BOARD_SPACES', () => {
  it('40マスある', () => {
    expect(BOARD_SPACES).toHaveLength(40);
  });
  it('position 0はGO', () => {
    expect(BOARD_SPACES[0].name).toBe('GO');
    expect(BOARD_SPACES[0].type).toBe('corner');
  });
  it('position 10は刑務所', () => {
    expect(BOARD_SPACES[10].name).toBe('刑務所');
    expect(BOARD_SPACES[10].type).toBe('corner');
  });
  it('position 20はFree Parking', () => {
    expect(BOARD_SPACES[20].type).toBe('corner');
  });
  it('position 30はGo to Jail', () => {
    expect(BOARD_SPACES[30].type).toBe('corner');
  });
  it('各マスのpositionがインデックスと一致する', () => {
    BOARD_SPACES.forEach((space, index) => {
      expect(space.position).toBe(index);
    });
  });
  it('物件にはpriceとrentが設定されている', () => {
    const properties = BOARD_SPACES.filter((s) => s.type === 'property');
    properties.forEach((p) => {
      expect(p.price).toBeGreaterThan(0);
      expect(p.rent).toBeDefined();
      expect(p.rent!.length).toBe(6);
    });
  });
  it('鉄道は4つある', () => {
    expect(BOARD_SPACES.filter((s) => s.type === 'railroad')).toHaveLength(4);
  });
  it('公共事業は2つある', () => {
    expect(BOARD_SPACES.filter((s) => s.type === 'utility')).toHaveLength(2);
  });
});

describe('createPropertyStates', () => {
  it('購入可能なマスの初期状態を生成する', () => {
    const states = createPropertyStates();
    const purchasable = BOARD_SPACES.filter(
      (s) =>
        s.type === 'property' || s.type === 'railroad' || s.type === 'utility',
    );
    expect(Object.keys(states)).toHaveLength(purchasable.length);
    Object.values(states).forEach((state) => {
      expect(state.ownerId).toBeNull();
      expect(state.houses).toBe(0);
      expect(state.isMortgaged).toBe(false);
    });
  });
});

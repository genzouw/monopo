import { describe, it, expect } from 'vitest';
import type { Player, PropertyState } from '../types';
import { BOARD_SPACES } from '../board';
import {
  calculateRent,
  canBuildHouse,
  findNearestSpace,
  calculateTotalAssets,
  canMortgage,
  canSellHouse,
} from '../rules';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'テスト',
    token: '🚗',
    money: 1500,
    position: 0,
    properties: [],
    inJail: false,
    jailTurns: 0,
    getOutOfJailCards: 0,
    isBankrupt: false,
    ...overrides,
  };
}

function makePropertyStates(
  overrides: Record<string, Partial<PropertyState>> = {},
): Record<string, PropertyState> {
  const states: Record<string, PropertyState> = {};
  for (const space of BOARD_SPACES) {
    if (
      space.type === 'property' ||
      space.type === 'railroad' ||
      space.type === 'utility'
    ) {
      states[space.id] = {
        ownerId: null,
        houses: 0,
        isMortgaged: false,
        ...overrides[space.id],
      };
    }
  }
  return states;
}

describe('calculateRent', () => {
  it('未所有の場合は0を返す', () => {
    const states = makePropertyStates();
    expect(calculateRent('mediterranean', states, BOARD_SPACES, [3, 4])).toBe(
      0,
    );
  });

  it('基本家賃を返す', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 0, isMortgaged: false },
    });
    expect(calculateRent('mediterranean', states, BOARD_SPACES, [3, 4])).toBe(
      2,
    );
  });

  it('カラーグループ独占時は2倍の家賃', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 0, isMortgaged: false },
      baltic: { ownerId: 'p1', houses: 0, isMortgaged: false },
    });
    expect(calculateRent('mediterranean', states, BOARD_SPACES, [3, 4])).toBe(
      4,
    );
  });

  it('家がある場合は対応する家賃を返す', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 2, isMortgaged: false },
      baltic: { ownerId: 'p1', houses: 0, isMortgaged: false },
    });
    // rent[2] = 30
    expect(calculateRent('mediterranean', states, BOARD_SPACES, [3, 4])).toBe(
      30,
    );
  });

  it('抵当に入っている場合は0を返す', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 0, isMortgaged: true },
    });
    expect(calculateRent('mediterranean', states, BOARD_SPACES, [3, 4])).toBe(
      0,
    );
  });

  it('鉄道1つ所有時は$25', () => {
    const states = makePropertyStates({
      'reading-rr': { ownerId: 'p1', houses: 0, isMortgaged: false },
    });
    expect(calculateRent('reading-rr', states, BOARD_SPACES, [3, 4])).toBe(25);
  });

  it('鉄道2つ所有時は$50', () => {
    const states = makePropertyStates({
      'reading-rr': { ownerId: 'p1', houses: 0, isMortgaged: false },
      'pennsylvania-rr': { ownerId: 'p1', houses: 0, isMortgaged: false },
    });
    expect(calculateRent('reading-rr', states, BOARD_SPACES, [3, 4])).toBe(50);
  });

  it('鉄道3つ所有時は$100', () => {
    const states = makePropertyStates({
      'reading-rr': { ownerId: 'p1', houses: 0, isMortgaged: false },
      'pennsylvania-rr': { ownerId: 'p1', houses: 0, isMortgaged: false },
      'bo-rr': { ownerId: 'p1', houses: 0, isMortgaged: false },
    });
    expect(calculateRent('reading-rr', states, BOARD_SPACES, [3, 4])).toBe(100);
  });

  it('鉄道4つ所有時は$200', () => {
    const states = makePropertyStates({
      'reading-rr': { ownerId: 'p1', houses: 0, isMortgaged: false },
      'pennsylvania-rr': { ownerId: 'p1', houses: 0, isMortgaged: false },
      'bo-rr': { ownerId: 'p1', houses: 0, isMortgaged: false },
      'shortline-rr': { ownerId: 'p1', houses: 0, isMortgaged: false },
    });
    expect(calculateRent('reading-rr', states, BOARD_SPACES, [3, 4])).toBe(200);
  });

  it('公共事業1つ所有時はサイコロ合計×4', () => {
    const states = makePropertyStates({
      electric: { ownerId: 'p1', houses: 0, isMortgaged: false },
    });
    expect(calculateRent('electric', states, BOARD_SPACES, [3, 4])).toBe(28); // 7 * 4
  });

  it('公共事業2つ所有時はサイコロ合計×10', () => {
    const states = makePropertyStates({
      electric: { ownerId: 'p1', houses: 0, isMortgaged: false },
      water: { ownerId: 'p1', houses: 0, isMortgaged: false },
    });
    expect(calculateRent('electric', states, BOARD_SPACES, [3, 4])).toBe(70); // 7 * 10
  });
});

describe('canBuildHouse', () => {
  it('独占していれば建設できる', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 0, isMortgaged: false },
      baltic: { ownerId: 'p1', houses: 0, isMortgaged: false },
    });
    expect(canBuildHouse('mediterranean', 'p1', states, BOARD_SPACES)).toBe(
      true,
    );
  });

  it('独占していなければ建設できない', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 0, isMortgaged: false },
      baltic: { ownerId: 'p2', houses: 0, isMortgaged: false },
    });
    expect(canBuildHouse('mediterranean', 'p1', states, BOARD_SPACES)).toBe(
      false,
    );
  });

  it('均等建設ルール：少ない方しか建設できない', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 1, isMortgaged: false },
      baltic: { ownerId: 'p1', houses: 0, isMortgaged: false },
    });
    // mediterranean は1つ、baltic は0なので、mediterraneanには建設できない
    expect(canBuildHouse('mediterranean', 'p1', states, BOARD_SPACES)).toBe(
      false,
    );
    // baltic には建設できる
    expect(canBuildHouse('baltic', 'p1', states, BOARD_SPACES)).toBe(true);
  });

  it('ホテル（5つ）以上は建設できない', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 5, isMortgaged: false },
      baltic: { ownerId: 'p1', houses: 5, isMortgaged: false },
    });
    expect(canBuildHouse('mediterranean', 'p1', states, BOARD_SPACES)).toBe(
      false,
    );
  });

  it('抵当に入っているグループには建設できない', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 0, isMortgaged: true },
      baltic: { ownerId: 'p1', houses: 0, isMortgaged: false },
    });
    expect(canBuildHouse('baltic', 'p1', states, BOARD_SPACES)).toBe(false);
  });
});

describe('findNearestSpace', () => {
  it('前方の鉄道を見つける', () => {
    // position 6 から最も近い鉄道は position 15（pennsylvania-rr）ではなく position 5（reading-rr）の次
    // reading-rrはposition 5、6より後は pennsylvania-rr の 15
    expect(findNearestSpace(6, 'railroad', BOARD_SPACES)).toBe(15);
  });

  it('折り返して最初の鉄道を見つける（ラップアラウンド）', () => {
    // position 36 の後の鉄道は… shortline-rr(35)はすでに過ぎているので、最初に戻って reading-rr(5)
    expect(findNearestSpace(36, 'railroad', BOARD_SPACES)).toBe(5);
  });

  it('前方の公共事業を見つける', () => {
    // position 10 からの最寄り utility は electric (12)
    expect(findNearestSpace(10, 'utility', BOARD_SPACES)).toBe(12);
  });

  it('折り返して最初の公共事業を見つける（ラップアラウンド）', () => {
    // position 29 以降の utility は存在しないので、折り返して electric(12)
    expect(findNearestSpace(29, 'utility', BOARD_SPACES)).toBe(12);
  });
});

describe('calculateTotalAssets', () => {
  it('現金のみの場合は現金を返す', () => {
    const player = makePlayer({ money: 1500, properties: [] });
    const states = makePropertyStates();
    expect(calculateTotalAssets(player, states, BOARD_SPACES)).toBe(1500);
  });

  it('物件あり（抵当なし）は現金＋抵当価値', () => {
    const player = makePlayer({ money: 1000, properties: ['mediterranean'] });
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 0, isMortgaged: false },
    });
    // 1000 + mortgageValue(30) = 1030
    expect(calculateTotalAssets(player, states, BOARD_SPACES)).toBe(1030);
  });

  it('家あり：現金＋抵当価値＋家の半額', () => {
    const player = makePlayer({ money: 500, properties: ['mediterranean'] });
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 2, isMortgaged: false },
    });
    // 500 + 30 (mortgage) + floor(50 * 2 / 2) = 500 + 30 + 50 = 580
    expect(calculateTotalAssets(player, states, BOARD_SPACES)).toBe(580);
  });
});

describe('canMortgage', () => {
  it('家がなければ抵当に入れられる', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 0, isMortgaged: false },
      baltic: { ownerId: 'p1', houses: 0, isMortgaged: false },
    });
    expect(canMortgage('mediterranean', 'p1', states, BOARD_SPACES)).toBe(true);
  });

  it('グループに家があれば抵当に入れられない', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 0, isMortgaged: false },
      baltic: { ownerId: 'p1', houses: 1, isMortgaged: false },
    });
    expect(canMortgage('mediterranean', 'p1', states, BOARD_SPACES)).toBe(
      false,
    );
  });
});

describe('canSellHouse', () => {
  it('家がある場合は売れる（均等ルール満たすとき）', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 2, isMortgaged: false },
      baltic: { ownerId: 'p1', houses: 2, isMortgaged: false },
    });
    expect(canSellHouse('mediterranean', 'p1', states, BOARD_SPACES)).toBe(
      true,
    );
  });

  it('家がない場合は売れない', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 0, isMortgaged: false },
      baltic: { ownerId: 'p1', houses: 0, isMortgaged: false },
    });
    expect(canSellHouse('mediterranean', 'p1', states, BOARD_SPACES)).toBe(
      false,
    );
  });
});

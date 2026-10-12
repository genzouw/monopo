import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CardAction } from '../types';
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS, shuffleCards } from '../cards';
import { getSecureRandomInt } from '../random';

// 乱数を差し替えられるようにする（既定は本物の実装）
vi.mock('../random', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../random')>();
  return { ...actual, getSecureRandomInt: vi.fn(actual.getSecureRandomInt) };
});

const EXPECTED_CHANCE: [string, CardAction][] = [
  ['ch1', { type: 'move', position: 0 }],
  ['ch2', { type: 'move', position: 24 }],
  ['ch3', { type: 'move', position: 11 }],
  ['ch4', { type: 'moveNearest', spaceType: 'railroad' }],
  ['ch5', { type: 'moveNearest', spaceType: 'railroad' }],
  ['ch6', { type: 'moveNearest', spaceType: 'utility' }],
  ['ch7', { type: 'money', amount: 50 }],
  ['ch8', { type: 'jailFree' }],
  ['ch9', { type: 'moveRelative', spaces: -3 }],
  ['ch10', { type: 'jail' }],
  ['ch11', { type: 'repair', perHouse: 25, perHotel: 100 }],
  ['ch12', { type: 'money', amount: -15 }],
  ['ch13', { type: 'move', position: 5 }],
  ['ch14', { type: 'move', position: 39 }],
  ['ch15', { type: 'moneyFromPlayers', amount: -50 }],
  ['ch16', { type: 'money', amount: 150 }],
];

const EXPECTED_COMMUNITY_CHEST: [string, CardAction][] = [
  ['cc1', { type: 'move', position: 0 }],
  ['cc2', { type: 'money', amount: 200 }],
  ['cc3', { type: 'money', amount: -50 }],
  ['cc4', { type: 'money', amount: 50 }],
  ['cc5', { type: 'jailFree' }],
  ['cc6', { type: 'jail' }],
  ['cc7', { type: 'money', amount: 100 }],
  ['cc8', { type: 'money', amount: 20 }],
  ['cc9', { type: 'moneyFromPlayers', amount: 10 }],
  ['cc10', { type: 'money', amount: 100 }],
  ['cc11', { type: 'money', amount: -100 }],
  ['cc12', { type: 'money', amount: -150 }],
  ['cc13', { type: 'money', amount: 25 }],
  ['cc14', { type: 'repair', perHouse: 40, perHotel: 115 }],
  ['cc15', { type: 'money', amount: 10 }],
  ['cc16', { type: 'money', amount: 100 }],
];

// text は金額・名前を含むため、改変を検出できるよう全文を照合する
const EXPECTED_CHANCE_TEXT: [string, string][] = [
  ['ch1', 'GOまですすもう！$200もらえるよ！'],
  ['ch2', 'ぎんざ通りにいこう！'],
  ['ch3', 'しぶや通りにいこう！'],
  ['ch4', 'いちばん近い鉄道にいこう！'],
  ['ch5', 'いちばん近い鉄道にいこう！'],
  ['ch6', 'いちばん近いでんき・すいどう会社にいこう！'],
  ['ch7', 'ぎんこうから$50もらえるよ！'],
  ['ch8', '刑務所から出られるカードをゲット！'],
  ['ch9', '3マスもどってね'],
  ['ch10', '刑務所にいってね…'],
  [
    'ch11',
    'おうちのしゅうり代！家1けんにつき$25、ホテル1つにつき$100はらってね',
  ],
  ['ch12', 'スピードいはんで$15はらってね'],
  ['ch13', 'ひがし鉄道にいこう！'],
  ['ch14', 'みなとみらい通りにいこう！'],
  ['ch15', 'みんなに$50ずつくばってね'],
  ['ch16', 'たてものの投資がうまくいったよ！$150もらえる！'],
];

const EXPECTED_COMMUNITY_CHEST_TEXT: [string, string][] = [
  ['cc1', 'GOまですすもう！$200もらえるよ！'],
  ['cc2', 'ぎんこうのまちがいで$200もらえるよ！'],
  ['cc3', 'おいしゃさんに$50はらってね'],
  ['cc4', 'かぶがうれたよ！$50もらえる！'],
  ['cc5', '刑務所から出られるカードをゲット！'],
  ['cc6', '刑務所にいってね…'],
  ['cc7', 'おやすみボーナス！$100もらえるよ！'],
  ['cc8', 'ぜいきんのもどりで$20もらえるよ！'],
  ['cc9', 'たんじょうび！みんなから$10ずつもらえるよ！'],
  ['cc10', 'ほけんがおりたよ！$100もらえる！'],
  ['cc11', 'びょういんに$100はらってね'],
  ['cc12', 'がっこうのぜいきんで$150はらってね'],
  ['cc13', 'コンサルのおしごとで$25もらえるよ！'],
  ['cc14', 'どうろのしゅうり！家1けんにつき$40、ホテル1つにつき$115はらってね'],
  ['cc15', 'びじんコンテストで2位！$10もらえるよ！'],
  ['cc16', 'おじいちゃんからおこづかい！$100もらえるよ！'],
];

describe('CHANCE_CARDS', () => {
  it('16枚ある', () => {
    expect(CHANCE_CARDS).toHaveLength(16);
  });
  it('すべてchanceタイプ', () => {
    CHANCE_CARDS.forEach((card) => {
      expect(card.type).toBe('chance');
    });
  });
  it('すべてテキストとアクションがある', () => {
    CHANCE_CARDS.forEach((card) => {
      expect(card.text.length).toBeGreaterThan(0);
      expect(card.action).toBeDefined();
    });
  });
});
describe('COMMUNITY_CHEST_CARDS', () => {
  it('16枚ある', () => {
    expect(COMMUNITY_CHEST_CARDS).toHaveLength(16);
  });
  it('すべてcommunityChestタイプ', () => {
    COMMUNITY_CHEST_CARDS.forEach((card) => {
      expect(card.type).toBe('communityChest');
    });
  });
  it('すべてテキストがある', () => {
    COMMUNITY_CHEST_CARDS.forEach((card) => {
      expect(card.text.length).toBeGreaterThan(0);
    });
  });
});
describe('カードの id と action の定義', () => {
  it('チャンスカードは id と action が定義どおりに並ぶ', () => {
    expect(CHANCE_CARDS.map((c) => [c.id, c.action])).toEqual(EXPECTED_CHANCE);
  });
  it('おたすけカードは id と action が定義どおりに並ぶ', () => {
    expect(COMMUNITY_CHEST_CARDS.map((c) => [c.id, c.action])).toEqual(
      EXPECTED_COMMUNITY_CHEST,
    );
  });
});
describe('カードの text の定義', () => {
  it('チャンスカードは id と text が定義どおりに並ぶ', () => {
    expect(CHANCE_CARDS.map((c) => [c.id, c.text])).toEqual(
      EXPECTED_CHANCE_TEXT,
    );
  });
  it('おたすけカードは id と text が定義どおりに並ぶ', () => {
    expect(COMMUNITY_CHEST_CARDS.map((c) => [c.id, c.text])).toEqual(
      EXPECTED_COMMUNITY_CHEST_TEXT,
    );
  });
});
describe('shuffleCards', () => {
  it('同じ枚数のカードを返す', () => {
    expect(shuffleCards(CHANCE_CARDS)).toHaveLength(CHANCE_CARDS.length);
  });
  it('元の配列を変更しない', () => {
    const original = [...CHANCE_CARDS];
    shuffleCards(CHANCE_CARDS);
    expect(CHANCE_CARDS).toEqual(original);
  });
  describe('乱数を固定したとき', () => {
    const cards = CHANCE_CARDS.slice(0, 4);
    const ids = (list: typeof cards) => list.map((c) => c.id);

    beforeEach(() => {
      vi.mocked(getSecureRandomInt).mockReset();
    });

    it('末尾から先頭の手前まで、(0, i) の範囲で乱数を引く', () => {
      vi.mocked(getSecureRandomInt).mockImplementation((_min, max) => max);
      shuffleCards(cards);
      expect(vi.mocked(getSecureRandomInt).mock.calls).toEqual([
        [0, 3],
        [0, 2],
        [0, 1],
      ]);
    });

    it('乱数が常に最大値なら並びは変わらない', () => {
      vi.mocked(getSecureRandomInt).mockImplementation((_min, max) => max);
      expect(ids(shuffleCards(cards))).toEqual(ids(cards));
    });

    it('乱数が常に 0 なら Fisher-Yates の手順どおりに入れ替わる', () => {
      vi.mocked(getSecureRandomInt).mockReturnValue(0);
      // [ch1, ch2, ch3, ch4] → i=3 で [ch4, ch2, ch3, ch1]
      // → i=2 で [ch3, ch2, ch4, ch1] → i=1 で [ch2, ch3, ch4, ch1]
      expect(ids(shuffleCards(cards))).toEqual(['ch2', 'ch3', 'ch4', 'ch1']);
    });

    it('空配列なら乱数を引かず空配列を返す', () => {
      expect(shuffleCards([])).toEqual([]);
      expect(getSecureRandomInt).not.toHaveBeenCalled();
    });
  });
});

import type { Card } from './types';

export const CHANCE_CARDS: Card[] = [
  {
    id: 'ch1',
    type: 'chance',
    text: 'GOまですすもう！$200もらえるよ！',
    action: { type: 'move', position: 0 },
  },
  {
    id: 'ch2',
    type: 'chance',
    text: 'ぎんざ通りにいこう！',
    action: { type: 'move', position: 24 },
  },
  {
    id: 'ch3',
    type: 'chance',
    text: 'しぶや通りにいこう！',
    action: { type: 'move', position: 11 },
  },
  {
    id: 'ch4',
    type: 'chance',
    text: 'いちばん近い鉄道にいこう！',
    action: { type: 'moveNearest', spaceType: 'railroad' },
  },
  {
    id: 'ch5',
    type: 'chance',
    text: 'いちばん近い鉄道にいこう！',
    action: { type: 'moveNearest', spaceType: 'railroad' },
  },
  {
    id: 'ch6',
    type: 'chance',
    text: 'いちばん近いでんき・すいどう会社にいこう！',
    action: { type: 'moveNearest', spaceType: 'utility' },
  },
  {
    id: 'ch7',
    type: 'chance',
    text: 'ぎんこうから$50もらえるよ！',
    action: { type: 'money', amount: 50 },
  },
  {
    id: 'ch8',
    type: 'chance',
    text: '刑務所から出られるカードをゲット！',
    action: { type: 'jailFree' },
  },
  {
    id: 'ch9',
    type: 'chance',
    text: '3マスもどってね',
    action: { type: 'moveRelative', spaces: -3 },
  },
  {
    id: 'ch10',
    type: 'chance',
    text: '刑務所にいってね…',
    action: { type: 'jail' },
  },
  {
    id: 'ch11',
    type: 'chance',
    text: 'おうちのしゅうり代！家1けんにつき$25、ホテル1つにつき$100はらってね',
    action: { type: 'repair', perHouse: 25, perHotel: 100 },
  },
  {
    id: 'ch12',
    type: 'chance',
    text: 'スピードいはんで$15はらってね',
    action: { type: 'money', amount: -15 },
  },
  {
    id: 'ch13',
    type: 'chance',
    text: 'ひがし鉄道にいこう！',
    action: { type: 'move', position: 5 },
  },
  {
    id: 'ch14',
    type: 'chance',
    text: 'みなとみらい通りにいこう！',
    action: { type: 'move', position: 39 },
  },
  {
    id: 'ch15',
    type: 'chance',
    text: 'みんなに$50ずつくばってね',
    action: { type: 'moneyFromPlayers', amount: -50 },
  },
  {
    id: 'ch16',
    type: 'chance',
    text: 'たてものの投資がうまくいったよ！$150もらえる！',
    action: { type: 'money', amount: 150 },
  },
];

export const COMMUNITY_CHEST_CARDS: Card[] = [
  {
    id: 'cc1',
    type: 'communityChest',
    text: 'GOまですすもう！$200もらえるよ！',
    action: { type: 'move', position: 0 },
  },
  {
    id: 'cc2',
    type: 'communityChest',
    text: 'ぎんこうのまちがいで$200もらえるよ！',
    action: { type: 'money', amount: 200 },
  },
  {
    id: 'cc3',
    type: 'communityChest',
    text: 'おいしゃさんに$50はらってね',
    action: { type: 'money', amount: -50 },
  },
  {
    id: 'cc4',
    type: 'communityChest',
    text: 'かぶがうれたよ！$50もらえる！',
    action: { type: 'money', amount: 50 },
  },
  {
    id: 'cc5',
    type: 'communityChest',
    text: '刑務所から出られるカードをゲット！',
    action: { type: 'jailFree' },
  },
  {
    id: 'cc6',
    type: 'communityChest',
    text: '刑務所にいってね…',
    action: { type: 'jail' },
  },
  {
    id: 'cc7',
    type: 'communityChest',
    text: 'おやすみボーナス！$100もらえるよ！',
    action: { type: 'money', amount: 100 },
  },
  {
    id: 'cc8',
    type: 'communityChest',
    text: 'ぜいきんのもどりで$20もらえるよ！',
    action: { type: 'money', amount: 20 },
  },
  {
    id: 'cc9',
    type: 'communityChest',
    text: 'たんじょうび！みんなから$10ずつもらえるよ！',
    action: { type: 'moneyFromPlayers', amount: 10 },
  },
  {
    id: 'cc10',
    type: 'communityChest',
    text: 'ほけんがおりたよ！$100もらえる！',
    action: { type: 'money', amount: 100 },
  },
  {
    id: 'cc11',
    type: 'communityChest',
    text: 'びょういんに$100はらってね',
    action: { type: 'money', amount: -100 },
  },
  {
    id: 'cc12',
    type: 'communityChest',
    text: 'がっこうのぜいきんで$150はらってね',
    action: { type: 'money', amount: -150 },
  },
  {
    id: 'cc13',
    type: 'communityChest',
    text: 'コンサルのおしごとで$25もらえるよ！',
    action: { type: 'money', amount: 25 },
  },
  {
    id: 'cc14',
    type: 'communityChest',
    text: 'どうろのしゅうり！家1けんにつき$40、ホテル1つにつき$115はらってね',
    action: { type: 'repair', perHouse: 40, perHotel: 115 },
  },
  {
    id: 'cc15',
    type: 'communityChest',
    text: 'びじんコンテストで2位！$10もらえるよ！',
    action: { type: 'money', amount: 10 },
  },
  {
    id: 'cc16',
    type: 'communityChest',
    text: 'おじいちゃんからおこづかい！$100もらえるよ！',
    action: { type: 'money', amount: 100 },
  },
];

export function shuffleCards(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

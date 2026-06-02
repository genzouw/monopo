import { describe, it, expect } from 'vitest';
import {
  CRYPTO_INITIAL_PRICE,
  CRYPTO_MIN_RATIO,
  CRYPTO_MAX_RATIO,
  ESG_DIVIDEND_INTERVAL,
  VC_MATURITY_TURNS,
  buyCrypto,
  sellCrypto,
  calculateNextCryptoPrice,
  resolveVCInvestment,
  isVCMatured,
  calculateESGDividend,
  isESGDividendTurn,
} from '../systems/altAssets';
import { createInitialGameState, gameReducer } from '../reducer';
import type { GameState } from '../types';

function startGame(features?: { altAssets?: boolean }): GameState {
  return gameReducer(createInitialGameState(), {
    type: 'START_GAME',
    playerNames: ['たろう', 'はなこ'],
    playerTokens: ['🚗', '🎩'],
    features,
  });
}

// ── 暗号資産（対数正規分布モデル） ──

describe('calculateNextCryptoPrice', () => {
  it('シード固定時に同じ入力から同じ価格が得られる（再現性）', () => {
    const price1 = calculateNextCryptoPrice(1000, 1000, 5, 'player-0');
    const price2 = calculateNextCryptoPrice(1000, 1000, 5, 'player-0');
    expect(price1).toBe(price2);
  });

  it('ターン番号が異なれば価格が異なる', () => {
    const price1 = calculateNextCryptoPrice(1000, 1000, 1, 'player-0');
    const price2 = calculateNextCryptoPrice(1000, 1000, 2, 'player-0');
    expect(price1).not.toBe(price2);
  });

  it('プレイヤー ID が異なれば価格が異なる', () => {
    const price1 = calculateNextCryptoPrice(1000, 1000, 5, 'player-0');
    const price2 = calculateNextCryptoPrice(1000, 1000, 5, 'player-1');
    expect(price1).not.toBe(price2);
  });

  it('価格が初期価格の10%を下回らない', () => {
    const initial = CRYPTO_INITIAL_PRICE;
    const min = Math.round(initial * CRYPTO_MIN_RATIO);
    // 複数ターン試してすべてクランプ範囲内であることを確認
    for (let turn = 1; turn <= 100; turn++) {
      const price = calculateNextCryptoPrice(min, initial, turn, 'player-0');
      expect(price).toBeGreaterThanOrEqual(min);
    }
  });

  it('価格が初期価格の1000%を超えない', () => {
    const initial = CRYPTO_INITIAL_PRICE;
    const max = Math.round(initial * CRYPTO_MAX_RATIO);
    for (let turn = 1; turn <= 100; turn++) {
      const price = calculateNextCryptoPrice(max, initial, turn, 'player-0');
      expect(price).toBeLessThanOrEqual(max);
    }
  });
});

describe('buyCrypto / sellCrypto', () => {
  it('指定金額で暗号資産を購入しユニット数を計算する', () => {
    const holding = buyCrypto(500, 1000);
    expect(holding.units).toBeCloseTo(0.5);
    expect(holding.initialPrice).toBe(1000);
    expect(holding.currentPrice).toBe(1000);
  });

  it('売却で保有ユニット × 現在価格を取得する', () => {
    const holding = { units: 0.5, initialPrice: 1000, currentPrice: 2000 };
    expect(sellCrypto(holding)).toBe(1000);
  });
});

// ── スタートアップ投資（VC） ──

describe('resolveVCInvestment', () => {
  it('合計 ≥ 10 でユニコーン（10倍）になる', () => {
    const result = resolveVCInvestment(1000, 10);
    expect(result.type).toBe('unicorn');
    expect(result.payout).toBe(10000);
  });

  it('合計 ≤ 2 で倒産（全額消失）になる', () => {
    const result = resolveVCInvestment(1000, 2);
    expect(result.type).toBe('bankrupt');
    expect(result.payout).toBe(0);
  });

  it('合計 7-9 で+50%になる', () => {
    const result = resolveVCInvestment(1000, 7);
    expect(result.type).toBe('partial');
    expect(result.payout).toBe(1500);
  });

  it('合計 3-6 で-50%になる', () => {
    const result = resolveVCInvestment(1000, 5);
    expect(result.type).toBe('partial');
    expect(result.payout).toBe(500);
  });
});

describe('isVCMatured', () => {
  it(`投資から ${VC_MATURITY_TURNS} ターン後に満期になる`, () => {
    expect(isVCMatured({ amount: 100, investedTurn: 0 }, 5)).toBe(true);
  });

  it('5ターン未満では満期にならない', () => {
    expect(isVCMatured({ amount: 100, investedTurn: 0 }, 4)).toBe(false);
  });
});

// ── ESG投資 ──

describe('calculateESGDividend', () => {
  it('投資額の5%が配当される', () => {
    expect(calculateESGDividend({ amount: 1000 })).toBe(50);
  });

  it('端数は切り捨てる', () => {
    expect(calculateESGDividend({ amount: 333 })).toBe(16);
  });
});

describe('isESGDividendTurn', () => {
  it(`${ESG_DIVIDEND_INTERVAL} の倍数ターンで配当が発生する`, () => {
    expect(isESGDividendTurn(10)).toBe(true);
    expect(isESGDividendTurn(20)).toBe(true);
    expect(isESGDividendTurn(30)).toBe(true);
  });

  it('0ターン目は配当が発生しない（初期化直後）', () => {
    expect(isESGDividendTurn(0)).toBe(false);
  });

  it('10の倍数でないターンでは配当が発生しない', () => {
    expect(isESGDividendTurn(9)).toBe(false);
    expect(isESGDividendTurn(11)).toBe(false);
  });
});

// ── Reducer 統合テスト ──

describe('reducer: BUY_CRYPTO / SELL_CRYPTO', () => {
  it('BUY_CRYPTO でプレイヤーの資金が減り暗号資産を保有する', () => {
    const state = startGame({ altAssets: true });
    const after = gameReducer(state, { type: 'BUY_CRYPTO', amount: 500 });
    expect(after.players[0].money).toBe(1000);
    expect(after.players[0].cryptoHolding).toBeDefined();
    expect(after.players[0].cryptoHolding!.units).toBeCloseTo(0.5);
  });

  it('資金不足の場合は BUY_CRYPTO が無視される', () => {
    const state = startGame({ altAssets: true });
    const after = gameReducer(state, { type: 'BUY_CRYPTO', amount: 99999 });
    expect(after.players[0].cryptoHolding).toBeUndefined();
  });

  it('SELL_CRYPTO で暗号資産が消えて資金が戻る', () => {
    const state = startGame({ altAssets: true });
    const bought = gameReducer(state, { type: 'BUY_CRYPTO', amount: 500 });
    const sold = gameReducer(bought, { type: 'SELL_CRYPTO' });
    expect(sold.players[0].cryptoHolding).toBeUndefined();
    // 1500 で開始 → 500 で購入（残 1000）→ 同じ価格で売却（+500）→ 元の 1500 に戻る
    expect(sold.players[0].money).toBe(1500);
  });
});

describe('reducer: INVEST_VC', () => {
  it('INVEST_VC で資金が減り VC 投資が記録される', () => {
    const state = startGame({ altAssets: true });
    const after = gameReducer(state, { type: 'INVEST_VC', amount: 300 });
    expect(after.players[0].money).toBe(1200);
    expect(after.players[0].vcInvestments).toHaveLength(1);
    expect(after.players[0].vcInvestments![0].amount).toBe(300);
  });
});

describe('reducer: BUY_ESG / SELL_ESG', () => {
  it('BUY_ESG で資金が減り ESG 保有が追加される', () => {
    const state = startGame({ altAssets: true });
    const after = gameReducer(state, { type: 'BUY_ESG', amount: 400 });
    expect(after.players[0].money).toBe(1100);
    expect(after.players[0].esgHoldings).toHaveLength(1);
  });

  it('SELL_ESG で ESG 保有が削除されて資金が戻る', () => {
    const state = startGame({ altAssets: true });
    const bought = gameReducer(state, { type: 'BUY_ESG', amount: 400 });
    const sold = gameReducer(bought, { type: 'SELL_ESG', index: 0 });
    expect(sold.players[0].esgHoldings).toBeUndefined();
    expect(sold.players[0].money).toBe(1500);
  });
});

describe('reducer: ESGが10ターンごとに配当を支払う', () => {
  it('10ターン後に ESG 配当が支払われる', () => {
    let state = startGame({ altAssets: true });
    // プレイヤー0がESG購入
    state = gameReducer(state, { type: 'BUY_ESG', amount: 1000 });
    const moneyAfterBuy = state.players[0].money; // 500

    // 10ターン分 END_TURN を発行（2プレイヤーで交互、各5回ずつ）
    for (let i = 0; i < 10; i++) {
      state = gameReducer(state, { type: 'END_TURN' });
    }

    // turnCount = 10 の時点で ESG 配当（1000 * 5% = 50）が支払われているはず
    const player0 = state.players.find((p) => p.id === 'player-0')!;
    expect(player0.money).toBeGreaterThan(moneyAfterBuy);
  });
});

describe('reducer: 暗号資産価格がターンごとに変動する', () => {
  it('END_TURN ごとに暗号資産の現在価格が更新される', () => {
    let state = startGame({ altAssets: true });
    state = gameReducer(state, { type: 'BUY_CRYPTO', amount: 500 });
    const priceAfterBuy = state.players[0].cryptoHolding!.currentPrice;

    state = gameReducer(state, { type: 'END_TURN' });

    // 2プレイヤーゲームで END_TURN 後は player-1 の番になる
    // player-0 の価格は更新されているはず
    const player0 = state.players.find((p) => p.id === 'player-0')!;
    // 価格が同じ場合は極めてまれなので、変動していることを確認
    // （確率的にほぼ必ず異なる値になる）
    expect(player0.cryptoHolding).toBeDefined();
    // turnCount=1 のシードで計算した価格が priceAfterBuy と異なることを確認
    const expectedPrice = calculateNextCryptoPrice(
      priceAfterBuy,
      CRYPTO_INITIAL_PRICE,
      1,
      'player-0',
    );
    expect(player0.cryptoHolding!.currentPrice).toBe(expectedPrice);
  });
});

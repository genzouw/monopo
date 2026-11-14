import fc from 'fast-check';
import * as randomModule from '../random';
import { afterEach, describe, it, expect, vi } from 'vitest';
import type { GameAction } from '../actions';
import { createInitialGameState, gameReducer } from '../reducer';
import type { GameState, TurnPhase } from '../types';
import { MAX_PLAYERS, MIN_PLAYERS, TOKENS } from '../types';

// ── gameReducer の不変条件をランダムなアクション列で検証する（property-based testing） ──

const GAME_PHASES: readonly GameState['phase'][] = [
  'setup',
  'playing',
  'finished',
];

const TURN_PHASES: readonly TurnPhase[] = [
  'roll',
  'moving',
  'landed',
  'action',
  'auction',
  'trade',
  'tradeConfirm',
  'build',
  'sell',
  'stock',
  'altAsset',
  'forceBuy',
  'forceSell',
  'bankrupt',
  'endTurn',
];

// 最初は引数のない（または固定の引数で済む）アクションに限る。
// 物件 ID や金額を伴うアクションは、生成方法を決めてから追加する。
const actionArbitrary: fc.Arbitrary<GameAction> = fc.constantFrom<GameAction>(
  { type: 'ROLL_DICE' },
  { type: 'FINISH_MOVING' },
  { type: 'BUY_PROPERTY' },
  { type: 'DECLINE_PURCHASE' },
  { type: 'PASS_AUCTION' },
  { type: 'DRAW_CARD' },
  { type: 'DISMISS_CARD' },
  { type: 'PAY_TAX' },
  { type: 'FORCE_BUY' },
  { type: 'DECLINE_FORCE_BUY' },
  { type: 'OPEN_BUILD_DIALOG' },
  { type: 'CLOSE_BUILD_DIALOG' },
  { type: 'OPEN_SELL_DIALOG' },
  { type: 'CLOSE_SELL_DIALOG' },
  { type: 'CLOSE_TRADE_DIALOG' },
  { type: 'ACCEPT_TRADE' },
  { type: 'REJECT_TRADE' },
  { type: 'PAY_JAIL_FINE' },
  { type: 'USE_JAIL_CARD' },
  { type: 'ROLL_FOR_JAIL' },
  { type: 'DECLARE_BANKRUPTCY', creditorId: null },
  { type: 'END_TURN' },
);

/**
 * ゲーム内の乱数（サイコロ・カードのシャッフル）を、シード付き PRNG で決定的にする。
 * fast-check が生成したシードを使うため、反例はシードごと再現できる。
 *
 * @param seed - `mulberry32` に渡すシード
 */
function mockGameRandom(seed: number): void {
  const next = randomModule.mulberry32(seed);
  vi.spyOn(randomModule, 'getSecureRandomInt').mockImplementation(
    (min, max) => min + Math.floor(next() * (max - min + 1)),
  );
  vi.spyOn(randomModule, 'getSecureRandom').mockImplementation(next);
}

/**
 * 指定人数で `START_GAME` を適用した直後の状態を返す。
 *
 * @param count - プレイヤー人数
 * @returns playing フェーズの初期状態
 */
function startedGame(count: number): GameState {
  return gameReducer(createInitialGameState(), {
    type: 'START_GAME',
    playerNames: Array.from({ length: count }, (_, i) => `プレイヤー${i + 1}`),
    playerTokens: TOKENS.slice(0, count),
  });
}

/**
 * 実装から確認できた不変条件を検査する。
 *
 * @param state - 検査対象の状態
 */
function expectInvariants(state: GameState): void {
  expect(GAME_PHASES).toContain(state.phase);
  expect(TURN_PHASES).toContain(state.turnPhase);
  expect(state.currentPlayerIndex).toBeGreaterThanOrEqual(0);
  expect(state.currentPlayerIndex).toBeLessThan(state.players.length);
  for (const player of state.players) {
    expect(Number.isInteger(player.position)).toBe(true);
    expect(player.position).toBeGreaterThanOrEqual(0);
    expect(player.position).toBeLessThan(state.board.length);
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('gameReducer の不変条件', () => {
  it('START_GAME 後にアクション列をランダムに適用しても例外を投げず、不変条件を保つ', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.integer({ min: MIN_PLAYERS, max: MAX_PLAYERS }),
        fc.array(actionArbitrary, { maxLength: 60 }),
        (seed, playerCount, actions) => {
          mockGameRandom(seed);
          let state = startedGame(playerCount);
          expectInvariants(state);
          for (const action of actions) {
            state = gameReducer(state, action);
            expectInvariants(state);
          }
          vi.restoreAllMocks();
        },
      ),
    );
  });
});

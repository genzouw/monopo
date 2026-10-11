import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import GameBoard from '../GameBoard';
import { createInitialGameState, gameReducer } from '../../../game/reducer';
import type { GameState } from '../../../game/types';

afterEach(() => {
  cleanup();
});

/**
 * 代替資産ダイアログが開いた状態のゲーム状態を組み立てるヘルパー。
 * 現在のプレイヤーに暗号資産と ESG を 1 件ずつ保有させる。
 */
function makeAltAssetState(): GameState {
  const base = gameReducer(createInitialGameState(), {
    type: 'START_GAME',
    playerNames: ['たろう', 'はなこ'],
    playerTokens: ['🚗', '🎩'],
    features: { altAssets: true },
  });
  return {
    ...base,
    turnPhase: 'altAsset',
    players: base.players.map((player, index) =>
      index === base.currentPlayerIndex
        ? {
            ...player,
            cryptoHolding: { units: 1, initialPrice: 1000, currentPrice: 1000 },
            esgHoldings: [{ amount: 500, investedTurn: 1 }],
          }
        : player,
    ),
  };
}

describe('GameBoard 代替資産導線の統合', () => {
  it('ダイアログの操作を対応する action として dispatch する', () => {
    const dispatch = vi.fn();
    render(<GameBoard state={makeAltAssetState()} dispatch={dispatch} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'ふしぎなコインを$500でかう' }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'みらいのかいしゃを$500でとうしする',
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'ちきゅうにやさしい投資を$500でかう',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'ぜんぶうる' }));
    fireEvent.click(
      screen.getByRole('button', {
        name: '1けんめの ESG（$500、1ターンめ）をうる',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'とじる' }));

    expect(dispatch).toHaveBeenCalledWith({ type: 'BUY_CRYPTO', amount: 500 });
    expect(dispatch).toHaveBeenCalledWith({ type: 'INVEST_VC', amount: 500 });
    expect(dispatch).toHaveBeenCalledWith({ type: 'BUY_ESG', amount: 500 });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SELL_CRYPTO' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SELL_ESG', index: 0 });
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLOSE_ALT_ASSET_DIALOG' });
  });
});

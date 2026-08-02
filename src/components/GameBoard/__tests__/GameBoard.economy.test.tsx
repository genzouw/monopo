import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import GameBoard from '../GameBoard';
import { createInitialGameState, gameReducer } from '../../../game/reducer';
import type { EconomyStatus, GameState } from '../../../game/types';

afterEach(() => {
  cleanup();
});

/**
 * 景気インジケーターの表示検証用に、機能フラグと景気ステータスを指定した
 * ゲーム状態を組み立てるヘルパー。
 * @param options.enabled マクロ経済フラグ（既定: true）
 * @param options.status 景気ステータス（既定: 'normal'）
 * @returns 検証用のゲーム状態。
 */
function makeEconomyState(options?: {
  enabled?: boolean;
  status?: EconomyStatus;
}): GameState {
  const enabled = options?.enabled ?? true;
  const base = gameReducer(createInitialGameState(), {
    type: 'START_GAME',
    playerNames: ['たろう', 'はなこ'],
    playerTokens: ['🚗', '🎩'],
    features: { macroEconomy: enabled },
  });
  return { ...base, economyStatus: options?.status ?? 'normal' };
}

describe('GameBoard の景気インジケーター', () => {
  it('マクロ経済が有効なとき、現在の景気をアイコン付きで表示する', () => {
    render(<GameBoard state={makeEconomyState()} dispatch={() => {}} />);
    expect(screen.getByLabelText(/いまのけいき: 通常/)).toBeInTheDocument();
    expect(screen.getByText('けいき: 通常')).toBeInTheDocument();
  });

  it.each([
    ['boom', '好況', '☀️'],
    ['recession', '不況', '🌧️'],
    ['crisis', '金融危機', '⛈️'],
  ] as const)(
    '景気 %s のとき「%s」とアイコン %s を表示する',
    (status, label, icon) => {
      render(
        <GameBoard state={makeEconomyState({ status })} dispatch={() => {}} />,
      );
      const badge = screen.getByLabelText(new RegExp(`いまのけいき: ${label}`));
      expect(badge).toHaveTextContent(icon);
      expect(badge).toHaveTextContent(`けいき: ${label}`);
    },
  );

  it('マクロ経済が無効なときは景気を表示しない', () => {
    render(
      <GameBoard
        state={makeEconomyState({ enabled: false })}
        dispatch={() => {}}
      />,
    );
    expect(screen.queryByText(/^けいき: /)).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import LoanDialog from '../LoanDialog';
import type { GameState, Player } from '../../../game/types';

afterEach(() => {
  cleanup();
});

/** テスト用のプレイヤーを生成するヘルパー。 */
function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'プレイヤー1',
    token: '🐶',
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

/** テスト用のゲーム状態を生成するヘルパー。 */
function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'playing',
    players: [],
    currentPlayerIndex: 0,
    board: [],
    propertyStates: {},
    cards: { chance: [], communityChest: [] },
    dice: { values: [1, 1], doubles: 0, rolled: false },
    turnPhase: 'roll',
    auction: null,
    trade: null,
    currentCard: null,
    message: '',
    winnerId: null,
    ...overrides,
  };
}

describe('LoanDialog', () => {
  it('借入金額に負値を入力すると、無反応にせずエラー表示と「かりる」ボタンの無効化で伝える', () => {
    const player = makePlayer({ money: 1500 });
    const state = makeState();
    render(
      <LoanDialog
        state={state}
        currentPlayer={player}
        onTakeLoan={vi.fn()}
        onRepayLoan={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const input = screen.getByLabelText('借入金額');
    fireEvent.change(input, { target: { value: '-1' } });
    // 入力は無視されず state に反映される（無反応にしない）
    expect(input).toHaveValue(-1);
    expect(
      screen.getByText('かりられる上限をこえているか、正しくないよ'),
    ).toBeInTheDocument();
    const borrowButton = screen.getByRole('button', { name: 'かりる' });
    expect(borrowButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('返済金額に負値を入力すると、無反応にせずエラー表示と「返済する」ボタンの無効化で伝える', () => {
    const player = makePlayer({ money: 1500, loanBalance: 500 });
    const state = makeState();
    render(
      <LoanDialog
        state={state}
        currentPlayer={player}
        onTakeLoan={vi.fn()}
        onRepayLoan={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const input = screen.getByLabelText('返済金額');
    fireEvent.change(input, { target: { value: '-1' } });
    expect(input).toHaveValue(-1);
    expect(
      screen.getByText('返済する金額を正しく入力してね'),
    ).toBeInTheDocument();
    const repayButton = screen.getByRole('button', { name: '返済する' });
    expect(repayButton).toHaveAttribute('aria-disabled', 'true');
  });
});

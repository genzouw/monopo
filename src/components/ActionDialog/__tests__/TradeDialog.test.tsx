import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import TradeDialog from '../TradeDialog';
import type { Player } from '../../../game/types';

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

describe('TradeDialog', () => {
  it('提示金額に負値を入力すると、無反応にせずエラー表示と提案ボタンの無効化で伝える', () => {
    const currentPlayer = makePlayer({ id: 'p1', money: 1500 });
    const targetPlayer = makePlayer({ id: 'p2', name: 'プレイヤー2' });
    render(
      <TradeDialog
        currentPlayer={currentPlayer}
        targetPlayer={targetPlayer}
        board={[]}
        propertyStates={{}}
        onPropose={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const [offerMoneyInput] = screen.getAllByLabelText('おかね: $');
    fireEvent.change(offerMoneyInput, { target: { value: '-1' } });
    // 入力は無視されず state に反映される（無反応にしない）
    expect(offerMoneyInput).toHaveValue(-1);
    expect(screen.getByText('0以上の金額を入力してね')).toBeInTheDocument();
    const proposeButton = screen.getByRole('button', {
      name: 'ていあんする！',
    });
    expect(proposeButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('要求金額に負値を入力すると、無反応にせずエラー表示と提案ボタンの無効化で伝える', () => {
    const currentPlayer = makePlayer({ id: 'p1', money: 1500 });
    const targetPlayer = makePlayer({
      id: 'p2',
      name: 'プレイヤー2',
      money: 1500,
    });
    render(
      <TradeDialog
        currentPlayer={currentPlayer}
        targetPlayer={targetPlayer}
        board={[]}
        propertyStates={{}}
        onPropose={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const [, requestMoneyInput] = screen.getAllByLabelText('おかね: $');
    fireEvent.change(requestMoneyInput, { target: { value: '-1' } });
    expect(requestMoneyInput).toHaveValue(-1);
    expect(screen.getByText('0以上の金額を入力してね')).toBeInTheDocument();
    const proposeButton = screen.getByRole('button', {
      name: 'ていあんする！',
    });
    expect(proposeButton).toHaveAttribute('aria-disabled', 'true');
  });
});

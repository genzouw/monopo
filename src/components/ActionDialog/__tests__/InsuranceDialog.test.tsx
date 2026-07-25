import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import InsuranceDialog from '../InsuranceDialog';
import type { BoardSpace, Player } from '../../../game/types';
import { calculatePremium } from '../../../game/insurance';

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

/** テスト用の土地マスを生成するヘルパー。 */
function makeProperty(overrides: Partial<BoardSpace> = {}): BoardSpace {
  return {
    id: 'prop1',
    position: 1,
    type: 'property',
    name: 'さくら通り',
    color: 'brown',
    price: 100,
    ...overrides,
  };
}

describe('InsuranceDialog', () => {
  it('所有する土地に未加入なら「入る」ボタンで onBuy が呼ばれる', () => {
    const onBuy = vi.fn();
    const board = [makeProperty()];
    const player = makePlayer({ properties: ['prop1'] });
    render(
      <InsuranceDialog
        currentPlayer={player}
        board={board}
        insuranceState={undefined}
        onBuy={onBuy}
        onCancel={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const premium = calculatePremium(100);
    const buyButton = screen.getByRole('button', {
      name: new RegExp(`入る（\\$${premium}）`),
    });
    fireEvent.click(buyButton);
    expect(onBuy).toHaveBeenCalledWith('prop1');
  });

  it('加入済みの土地は「加入中」表示と「かいやく」ボタンを持つ', () => {
    const onCancel = vi.fn();
    const board = [makeProperty()];
    const player = makePlayer({ properties: ['prop1'] });
    render(
      <InsuranceDialog
        currentPlayer={player}
        board={board}
        insuranceState={{ prop1: true }}
        onBuy={vi.fn()}
        onCancel={onCancel}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/加入中/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'かいやく' }));
    expect(onCancel).toHaveBeenCalledWith('prop1');
  });

  it('保険料が払えないときは加入ボタンが無効化される', () => {
    const onBuy = vi.fn();
    const board = [makeProperty({ price: 100 })];
    // 保険料（100 × 3% = 3）に満たない所持金
    const player = makePlayer({ properties: ['prop1'], money: 1 });
    render(
      <InsuranceDialog
        currentPlayer={player}
        board={board}
        insuranceState={undefined}
        onBuy={onBuy}
        onCancel={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const buyButton = screen.getByRole('button', { name: /入る/ });
    expect(buyButton).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('おかねがたりないよ')).toBeInTheDocument();
    fireEvent.click(buyButton);
    expect(onBuy).not.toHaveBeenCalled();
  });

  it('鉄道・公共施設は保険対象外で一覧に出ない', () => {
    const board: BoardSpace[] = [
      makeProperty(),
      {
        id: 'rr1',
        position: 5,
        type: 'railroad',
        name: 'なかよし鉄道',
        price: 200,
      },
    ];
    const player = makePlayer({ properties: ['prop1', 'rr1'] });
    render(
      <InsuranceDialog
        currentPlayer={player}
        board={board}
        insuranceState={undefined}
        onBuy={vi.fn()}
        onCancel={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('さくら通り')).toBeInTheDocument();
    expect(screen.queryByText('なかよし鉄道')).not.toBeInTheDocument();
  });

  it('保険対象の土地を持たないときは空状態を表示する', () => {
    const player = makePlayer({ properties: [] });
    render(
      <InsuranceDialog
        currentPlayer={player}
        board={[makeProperty()]}
        insuranceState={undefined}
        onBuy={vi.fn()}
        onCancel={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('ほけんに入れる土地がないよ')).toBeInTheDocument();
  });
});

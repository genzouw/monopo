import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import StockDialog from '../StockDialog';
import type { ColorGroupStock, Player } from '../../../game/types';

afterEach(() => {
  cleanup();
});

const player: Player = {
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
};

const market: Partial<Record<'brown', ColorGroupStock>> = {
  brown: {
    color: 'brown',
    pricePerShare: 100,
    totalShares: 100,
    bankShares: 50,
  },
};

function renderDialog(
  bubbleColors?: 'brown'[],
  buyPrices?: Partial<Record<'brown', number>>,
) {
  return render(
    <StockDialog
      currentPlayer={player}
      stockMarket={market}
      bubbleColors={bubbleColors}
      buyPrices={buyPrices}
      onBuy={vi.fn()}
      onSell={vi.fn()}
      onClose={vi.fn()}
    />,
  );
}

describe('StockDialog のバブル表示', () => {
  it('バブルなしでは従来どおり「かかく」を 1 つだけ表示する', () => {
    renderDialog();
    expect(screen.getByText(/かかく: \$100/)).toBeTruthy();
    expect(screen.queryByText(/バブルちゅう/)).toBeNull();
  });

  it('バブル中は、買い価格（乗数あり）と売り価格（乗数なし）を分けて表示する', () => {
    renderDialog(['brown'], { brown: 140 });
    expect(screen.getByText(/かうとき: \$140 \/ うるとき: \$100/)).toBeTruthy();
    expect(screen.getByText(/バブルちゅう/)).toBeTruthy();
  });

  it('買い価格は呼び出し側から渡された値をそのまま表示する（ダイアログ側で再計算しない）', () => {
    renderDialog(['brown'], { brown: 56 });
    expect(screen.getByText(/かうとき: \$56 \/ うるとき: \$100/)).toBeTruthy();
  });
});

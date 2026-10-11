import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import AltAssetDialog from '../AltAssetDialog';
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

/** 全コールバックをモックにしたダイアログを描画する。 */
function renderDialog(player: Player) {
  const handlers = {
    onBuyCrypto: vi.fn(),
    onSellCrypto: vi.fn(),
    onInvestVC: vi.fn(),
    onBuyESG: vi.fn(),
    onSellESG: vi.fn(),
    onClose: vi.fn(),
  };
  render(<AltAssetDialog currentPlayer={player} {...handlers} />);
  return handlers;
}

describe('AltAssetDialog', () => {
  it('購入ボタンで各アクションが金額つきで呼ばれる', () => {
    const h = renderDialog(makePlayer());
    const buttons = screen.getAllByRole('button', { name: /\$500で/ });
    // 並び順: 暗号資産 → VC → ESG
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    fireEvent.click(buttons[2]);
    expect(h.onBuyCrypto).toHaveBeenCalledWith(500);
    expect(h.onInvestVC).toHaveBeenCalledWith(500);
    expect(h.onBuyESG).toHaveBeenCalledWith(500);
  });

  it('同じ金額の購入ボタンが資産ごとに区別できるアクセシブル名を持つ', () => {
    renderDialog(makePlayer());
    const names = screen
      .getAllByRole('button', { name: /\$500で/ })
      .map((b) => b.getAttribute('aria-label'));
    expect(new Set(names).size).toBe(3);
    expect(names).toEqual([
      'ふしぎなコインを$500でかう',
      'みらいのかいしゃを$500でとうしする',
      'ちきゅうにやさしい投資を$500でかう',
    ]);
  });

  it('所持金が足りない金額の購入は呼ばれない', () => {
    const h = renderDialog(makePlayer({ money: 50 }));
    for (const b of screen.getAllByRole('button', { name: /\$100で/ })) {
      fireEvent.click(b);
    }
    expect(h.onBuyCrypto).not.toHaveBeenCalled();
    expect(h.onInvestVC).not.toHaveBeenCalled();
    expect(h.onBuyESG).not.toHaveBeenCalled();
  });

  it('暗号資産を保有していなければ売却は呼ばれず、保有していれば呼ばれる', () => {
    const none = renderDialog(makePlayer());
    fireEvent.click(screen.getByRole('button', { name: 'ぜんぶうる' }));
    expect(none.onSellCrypto).not.toHaveBeenCalled();
    cleanup();

    const held = renderDialog(
      makePlayer({
        cryptoHolding: { units: 1, initialPrice: 1000, currentPrice: 1000 },
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'ぜんぶうる' }));
    expect(held.onSellCrypto).toHaveBeenCalledTimes(1);
  });

  it('ESG 保有を index 指定で売却できる', () => {
    const h = renderDialog(
      makePlayer({
        esgHoldings: [
          { amount: 100, investedTurn: 1 },
          { amount: 500, investedTurn: 2 },
        ],
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: '2けんめの ESG（$500、2ターンめ）をうる',
      }),
    );
    expect(h.onSellESG).toHaveBeenCalledWith(1);
  });

  it('とじるで onClose が呼ばれる', () => {
    const h = renderDialog(makePlayer());
    fireEvent.click(screen.getByRole('button', { name: 'とじる' }));
    expect(h.onClose).toHaveBeenCalled();
  });
});

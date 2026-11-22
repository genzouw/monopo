import { describe, it, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import AltAssetDialog from '../AltAssetDialog';
import AuctionDialog from '../AuctionDialog';
import BankruptDialog from '../BankruptDialog';
import BuildDialog from '../BuildDialog';
import CardDialog from '../CardDialog';
import ForceBuyDialog from '../ForceBuyDialog';
import InsuranceDialog from '../InsuranceDialog';
import JailDialog from '../JailDialog';
import LoanDialog from '../LoanDialog';
import PurchaseDialog from '../PurchaseDialog';
import SellDialog from '../SellDialog';
import StockDialog from '../StockDialog';
import TradeDialog from '../TradeDialog';
import { BOARD_SPACES, createPropertyStates } from '../../../game/board';
import type { GameState, Player } from '../../../game/types';
import { expectNoA11yViolations, valueOf } from '../../../test-utils';

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
    board: BOARD_SPACES,
    propertyStates: createPropertyStates(),
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

const space = (id: string) =>
  valueOf(Object.fromEntries(BOARD_SPACES.map((s) => [s.id, s])), id);

// 所有物件を持つプレイヤー（建築・売却・保険・トレードの描画に使う）
const owned = ['mediterranean', 'baltic'];
const owner = makePlayer({ properties: owned });
const ownedStates = () => {
  const states = createPropertyStates();
  for (const id of owned) {
    states[id] = { ownerId: 'p1', houses: 0, isMortgaged: false };
  }
  return states;
};
const noop = vi.fn();

// axe.run は同時に 2 回呼べないため、concurrent は使わない
describe('ActionDialog の WCAG 2.1 A/AA 検査（jsdom）', () => {
  it('AltAssetDialog', async () => {
    const { container } = render(
      <AltAssetDialog
        currentPlayer={makePlayer()}
        onBuyCrypto={noop}
        onSellCrypto={noop}
        onInvestVC={noop}
        onBuyESG={noop}
        onSellESG={noop}
        onClose={noop}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it('AuctionDialog', async () => {
    const players = [
      makePlayer(),
      makePlayer({ id: 'p2', name: 'プレイヤー2' }),
    ];
    const { container } = render(
      <AuctionDialog
        auction={{
          propertyId: 'mediterranean',
          currentBid: 10,
          currentBidderId: 'p2',
          passedPlayerIds: [],
          activePlayerIndex: 0,
          sellerId: null,
        }}
        players={players}
        currentPlayer={players[0] ?? makePlayer()}
        onBid={noop}
        onPass={noop}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it('BankruptDialog', async () => {
    const { container } = render(
      <BankruptDialog playerName="プレイヤー1" onConfirm={noop} />,
    );
    await expectNoA11yViolations(container);
  });

  it('BuildDialog', async () => {
    const { container } = render(
      <BuildDialog
        currentPlayer={owner}
        board={BOARD_SPACES}
        propertyStates={ownedStates()}
        onBuild={noop}
        onSell={noop}
        onClose={noop}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it('CardDialog', async () => {
    const { container } = render(
      <CardDialog
        card={{
          id: 'c1',
          type: 'chance',
          text: 'GOまですすむ',
          action: { type: 'move', position: 0 },
        }}
        onDismiss={noop}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it('ForceBuyDialog', async () => {
    const { container } = render(
      <ForceBuyDialog
        space={space('mediterranean')}
        currentPlayer={makePlayer({ id: 'p2', name: 'プレイヤー2' })}
        owner={owner}
        houses={0}
        onBuy={noop}
        onDecline={noop}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it('InsuranceDialog', async () => {
    const { container } = render(
      <InsuranceDialog
        currentPlayer={owner}
        board={BOARD_SPACES}
        insuranceState={{ mediterranean: true }}
        onBuy={noop}
        onCancel={noop}
        onClose={noop}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it('JailDialog', async () => {
    const { container } = render(
      <JailDialog
        currentPlayer={makePlayer({ inJail: true, getOutOfJailCards: 1 })}
        onPayFine={noop}
        onUseCard={noop}
        onRollForJail={noop}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it('LoanDialog', async () => {
    const player = makePlayer({ loanBalance: 500 });
    const { container } = render(
      <LoanDialog
        state={makeState({ players: [player] })}
        currentPlayer={player}
        onTakeLoan={noop}
        onRepayLoan={noop}
        onClose={noop}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it('PurchaseDialog', async () => {
    const { container } = render(
      <PurchaseDialog
        space={space('mediterranean')}
        currentPlayer={makePlayer()}
        onBuy={noop}
        onDecline={noop}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it('SellDialog', async () => {
    const { container } = render(
      <SellDialog
        currentPlayer={owner}
        board={BOARD_SPACES}
        propertyStates={ownedStates()}
        onSell={noop}
        onSellHouse={noop}
        onClose={noop}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it('StockDialog', async () => {
    const { container } = render(
      <StockDialog
        currentPlayer={makePlayer({ stocks: { brown: 2 } })}
        stockMarket={{
          brown: {
            color: 'brown',
            pricePerShare: 100,
            totalShares: 10,
            bankShares: 8,
          },
        }}
        onBuy={noop}
        onSell={noop}
        onClose={noop}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it('TradeDialog', async () => {
    const { container } = render(
      <TradeDialog
        currentPlayer={owner}
        targetPlayer={makePlayer({ id: 'p2', name: 'プレイヤー2' })}
        board={BOARD_SPACES}
        propertyStates={ownedStates()}
        onPropose={noop}
        onClose={noop}
      />,
    );
    await expectNoA11yViolations(container);
  });
});

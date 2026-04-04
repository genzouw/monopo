import { useState } from 'react';
import type { Dispatch } from 'react';
import type { GameState } from '../../game/types';
import type { GameAction } from '../../game/actions';
import PlayerPanel from '../PlayerPanel/PlayerPanel';
import FocusView from '../Board/FocusView';
import MiniMap from '../Board/MiniMap';
import Dice from '../Dice/Dice';
import Button from '../common/Button';
import Dialog from '../common/Dialog';
import PurchaseDialog from '../ActionDialog/PurchaseDialog';
import AuctionDialog from '../ActionDialog/AuctionDialog';
import CardDialog from '../ActionDialog/CardDialog';
import JailDialog from '../ActionDialog/JailDialog';
import BuildDialog from '../ActionDialog/BuildDialog';
import MortgageDialog from '../ActionDialog/MortgageDialog';
import TradeDialog from '../ActionDialog/TradeDialog';
import BankruptDialog from '../ActionDialog/BankruptDialog';
import { useSound } from '../../sound/SoundContext';
import styles from './GameBoard.module.css';

type GameBoardProps = {
  state: GameState;
  dispatch: Dispatch<GameAction>;
};

export default function GameBoard({ state, dispatch }: GameBoardProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [showTradeSelect, setShowTradeSelect] = useState(false);
  const [focusPosition, setFocusPosition] = useState<number | null>(null);
  const { muted, toggleMute, play } = useSound();

  const currentPlayer = state.players[state.currentPlayerIndex];
  const displayPosition = focusPosition ?? currentPlayer.position;

  const currentSpace = state.board.find(
    (s) => s.position === currentPlayer.position,
  );
  const isPurchasable =
    currentSpace &&
    (currentSpace.type === 'property' ||
      currentSpace.type === 'railroad' ||
      currentSpace.type === 'utility');
  const spaceHasNoOwner =
    isPurchasable && !state.propertyStates[currentSpace.id]?.ownerId;

  const handleRoll = () => {
    play('diceRoll');
    setIsRolling(true);
    dispatch({ type: 'ROLL_DICE' });
  };

  const handleRollComplete = () => {
    setIsRolling(false);
    setTimeout(() => {
      play('land');
      dispatch({ type: 'FINISH_MOVING' });
    }, 500);
  };

  const handleBuy = () => {
    play('purchase');
    dispatch({ type: 'BUY_PROPERTY' });
  };

  const handleDeclinePurchase = () => {
    dispatch({ type: 'DECLINE_PURCHASE' });
  };

  const handlePlaceBid = (increment: number) => {
    dispatch({
      type: 'PLACE_BID',
      amount: state.auction!.currentBid + increment,
    });
  };

  const handlePassAuction = () => {
    dispatch({ type: 'PASS_AUCTION' });
  };

  const handleDrawCard = () => {
    play('card');
    dispatch({ type: 'DRAW_CARD' });
  };

  const handleDismissCard = () => {
    dispatch({ type: 'DISMISS_CARD' });
  };

  const handlePayTax = () => {
    play('moneyLoss');
    dispatch({ type: 'PAY_TAX' });
  };

  const handleEndTurn = () => {
    setFocusPosition(null);
    dispatch({ type: 'END_TURN' });
  };

  const handlePayJailFine = () => {
    play('moneyLoss');
    dispatch({ type: 'PAY_JAIL_FINE' });
  };

  const handleUseJailCard = () => {
    dispatch({ type: 'USE_JAIL_CARD' });
  };

  const handleRollForJail = () => {
    play('diceRoll');
    setIsRolling(true);
    dispatch({ type: 'ROLL_FOR_JAIL' });
  };

  const handleBuildHouse = (propertyId: string) => {
    play('build');
    dispatch({ type: 'BUILD_HOUSE', propertyId });
  };

  const handleSellHouse = (propertyId: string) => {
    play('moneyGain');
    dispatch({ type: 'SELL_HOUSE', propertyId });
  };

  const handleMortgage = (propertyId: string) => {
    play('moneyGain');
    dispatch({ type: 'MORTGAGE_PROPERTY', propertyId });
  };

  const handleUnmortgage = (propertyId: string) => {
    play('moneyLoss');
    dispatch({ type: 'UNMORTGAGE_PROPERTY', propertyId });
  };

  const handleProposeTrade = (offer: import('../../game/types').TradeOffer) => {
    dispatch({ type: 'PROPOSE_TRADE', offer });
  };

  const handleBankrupt = () => {
    play('bankrupt');
    dispatch({ type: 'DECLARE_BANKRUPTCY', creditorId: null });
  };

  const otherActivePlayers = state.players.filter(
    (p) => p.id !== currentPlayer.id && !p.isBankrupt,
  );

  // Determine which dialog to show
  const showPurchaseDialog =
    state.turnPhase === 'action' &&
    isPurchasable &&
    spaceHasNoOwner &&
    !state.currentCard;

  const showCardDialog = !!state.currentCard;

  const showAuctionDialog = state.turnPhase === 'auction' && !!state.auction;

  const showJailDialog = state.turnPhase === 'roll' && currentPlayer.inJail;

  const showBuildDialog = state.turnPhase === 'build';

  const showMortgageDialog = state.turnPhase === 'mortgage';

  const showTradeDialog = state.turnPhase === 'trade' && !!state.trade;

  const showBankruptDialog = state.turnPhase === 'bankrupt';

  const canSubAction =
    state.turnPhase === 'endTurn' || state.turnPhase === 'roll';

  // Tax action
  const showPayTax =
    state.turnPhase === 'action' && currentSpace?.type === 'tax';

  // Draw card action
  const showDrawCard =
    state.turnPhase === 'action' &&
    (currentSpace?.type === 'chance' ||
      currentSpace?.type === 'communityChest') &&
    !state.currentCard;

  const tradeTargetPlayer = state.trade
    ? state.players.find((p) => p.id === state.trade!.toPlayerId)
    : null;

  return (
    <div className={styles.gameBoard}>
      <PlayerPanel
        currentPlayer={currentPlayer}
        allPlayers={state.players}
        currentPlayerIndex={state.currentPlayerIndex}
      />

      <div className={styles.boardSection}>
        <FocusView
          board={state.board}
          propertyStates={state.propertyStates}
          players={state.players}
          currentPosition={displayPosition}
        />
        <MiniMap
          board={state.board}
          propertyStates={state.propertyStates}
          players={state.players}
          onSpaceClick={(pos) => setFocusPosition(pos)}
        />
      </div>

      {state.message && <div className={styles.message}>{state.message}</div>}

      {state.dice.rolled && (
        <Dice
          values={state.dice.values}
          rolling={isRolling}
          onRollComplete={handleRollComplete}
        />
      )}

      <div className={styles.actions}>
        {state.turnPhase === 'roll' && !currentPlayer.inJail && (
          <Button size="large" onClick={handleRoll} disabled={isRolling}>
            🎲 さいころをふる！
          </Button>
        )}

        {showDrawCard && (
          <Button size="large" onClick={handleDrawCard}>
            カードをひく！
          </Button>
        )}

        {showPayTax && (
          <Button size="large" variant="danger" onClick={handlePayTax}>
            💸 ぜいきんをはらう（${currentSpace?.price}）
          </Button>
        )}

        {state.turnPhase === 'endTurn' && (
          <Button size="large" onClick={handleEndTurn}>
            つぎのひとへ →
          </Button>
        )}

        {canSubAction && (
          <div className={styles.subActions}>
            <Button
              size="small"
              variant="secondary"
              onClick={() => dispatch({ type: 'OPEN_BUILD_DIALOG' })}
            >
              🏠 いえをたてる
            </Button>
            <Button
              size="small"
              variant="secondary"
              onClick={() => dispatch({ type: 'OPEN_MORTGAGE_DIALOG' })}
            >
              🏦 ていとう
            </Button>
            {otherActivePlayers.length > 0 && (
              <Button
                size="small"
                variant="secondary"
                onClick={() => setShowTradeSelect(true)}
              >
                🤝 こうかん
              </Button>
            )}
          </div>
        )}
      </div>

      <button className={styles.muteButton} onClick={toggleMute}>
        {muted ? '🔇' : '🔊'}
      </button>

      {/* Dialogs */}
      {showPurchaseDialog && currentSpace && (
        <PurchaseDialog
          space={currentSpace}
          currentPlayer={currentPlayer}
          onBuy={handleBuy}
          onDecline={handleDeclinePurchase}
        />
      )}

      {showAuctionDialog && state.auction && (
        <AuctionDialog
          auction={state.auction}
          players={state.players}
          currentPlayer={currentPlayer}
          onBid={handlePlaceBid}
          onPass={handlePassAuction}
        />
      )}

      {showCardDialog && state.currentCard && (
        <CardDialog card={state.currentCard} onDismiss={handleDismissCard} />
      )}

      {showJailDialog && (
        <JailDialog
          currentPlayer={currentPlayer}
          onPayFine={handlePayJailFine}
          onUseCard={handleUseJailCard}
          onRollForJail={handleRollForJail}
        />
      )}

      {showBuildDialog && (
        <BuildDialog
          currentPlayer={currentPlayer}
          board={state.board}
          propertyStates={state.propertyStates}
          onBuild={handleBuildHouse}
          onSell={handleSellHouse}
          onClose={() => dispatch({ type: 'CLOSE_BUILD_DIALOG' })}
        />
      )}

      {showMortgageDialog && (
        <MortgageDialog
          currentPlayer={currentPlayer}
          board={state.board}
          propertyStates={state.propertyStates}
          onMortgage={handleMortgage}
          onUnmortgage={handleUnmortgage}
          onClose={() => dispatch({ type: 'CLOSE_MORTGAGE_DIALOG' })}
        />
      )}

      {showTradeDialog && state.trade && tradeTargetPlayer && (
        <TradeDialog
          currentPlayer={currentPlayer}
          targetPlayer={tradeTargetPlayer}
          board={state.board}
          propertyStates={state.propertyStates}
          onPropose={handleProposeTrade}
          onClose={() => dispatch({ type: 'CLOSE_TRADE_DIALOG' })}
        />
      )}

      {showBankruptDialog && (
        <BankruptDialog
          playerName={currentPlayer.name}
          onConfirm={handleBankrupt}
        />
      )}

      {/* Trade target selection modal */}
      {showTradeSelect && (
        <Dialog
          title="だれとこうかんする？"
          actions={
            <Button
              variant="secondary"
              onClick={() => setShowTradeSelect(false)}
            >
              キャンセル
            </Button>
          }
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '8px 0',
            }}
          >
            {otherActivePlayers.map((player) => (
              <Button
                key={player.id}
                variant="secondary"
                onClick={() => {
                  setShowTradeSelect(false);
                  dispatch({
                    type: 'OPEN_TRADE_DIALOG',
                    targetPlayerId: player.id,
                  });
                }}
              >
                {player.token} {player.name}
              </Button>
            ))}
          </div>
        </Dialog>
      )}
    </div>
  );
}

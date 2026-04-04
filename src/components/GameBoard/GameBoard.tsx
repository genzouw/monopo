import { useState, useRef } from 'react';
import type { Dispatch } from 'react';
import type { GameState } from '../../game/types';
import type { GameAction } from '../../game/actions';
import { BOARD_SPACES } from '../../game/board';
import { calculateTotalAssets } from '../../game/rules';
import PlayerPanel from '../PlayerPanel/PlayerPanel';
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
  const [animatingPosition, setAnimatingPosition] = useState<number | null>(
    null,
  );
  const [showPlayerDetail, setShowPlayerDetail] = useState<string | null>(null);
  const [showSpaceDetail, setShowSpaceDetail] = useState<number | null>(null);
  const { muted, toggleMute, play } = useSound();
  const movingRef = useRef(false);
  // Refs to capture current values for the animation callback
  const positionRef = useRef(0);
  const diceRef = useRef<[number, number]>([1, 1]);

  const currentPlayer = state.players[state.currentPlayerIndex];

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
    // Capture position before dispatch changes state
    positionRef.current = currentPlayer.position;
    play('diceRoll');
    setIsRolling(true);
    dispatch({ type: 'ROLL_DICE' });
  };

  const handleRollComplete = () => {
    setIsRolling(false);
    if (movingRef.current) return;
    movingRef.current = true;

    // Use refs to get correct values captured at roll time
    const startPos = positionRef.current;
    const diceTotal = diceRef.current[0] + diceRef.current[1];
    let step = 0;

    const moveInterval = setInterval(() => {
      step++;
      const nextPos = (startPos + step) % 40;
      setAnimatingPosition(nextPos);

      if (step >= diceTotal) {
        clearInterval(moveInterval);
        setTimeout(() => {
          play('land');
          setAnimatingPosition(null);
          movingRef.current = false;
          dispatch({ type: 'FINISH_MOVING' });
        }, 200);
      }
    }, 300);
  };

  // Keep diceRef in sync
  diceRef.current = state.dice.values;

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
    positionRef.current = currentPlayer.position;
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

  const showPayTax =
    state.turnPhase === 'action' && currentSpace?.type === 'tax';
  const showDrawCard =
    state.turnPhase === 'action' &&
    (currentSpace?.type === 'chance' ||
      currentSpace?.type === 'communityChest') &&
    !state.currentCard;

  const tradeTargetPlayer = state.trade
    ? state.players.find((p) => p.id === state.trade!.toPlayerId)
    : null;

  // Players with animating position override for minimap
  const displayPlayers =
    animatingPosition !== null
      ? state.players.map((p, i) =>
          i === state.currentPlayerIndex
            ? { ...p, position: animatingPosition }
            : p,
        )
      : state.players;

  return (
    <div className={styles.gameBoard}>
      <PlayerPanel
        currentPlayer={currentPlayer}
        allPlayers={state.players}
        currentPlayerIndex={state.currentPlayerIndex}
        onPlayerClick={(id) => setShowPlayerDetail(id)}
      />

      <div className={styles.boardSection}>
        <MiniMap
          board={state.board}
          propertyStates={state.propertyStates}
          players={displayPlayers}
          onSpaceClick={(pos) => setShowSpaceDetail(pos)}
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

      {/* Space detail dialog */}
      {showSpaceDetail !== null &&
        (() => {
          const space = BOARD_SPACES[showSpaceDetail];
          if (!space) return null;
          const ps = state.propertyStates[space.id];
          const owner = ps?.ownerId
            ? state.players.find((p) => p.id === ps.ownerId)
            : null;
          const isProp = space.type === 'property';
          const isRR = space.type === 'railroad';
          const isUtil = space.type === 'utility';
          const purchasable = isProp || isRR || isUtil;

          const rentLabels = isProp
            ? [
                'たてものなし',
                '家1けん',
                '家2けん',
                '家3けん',
                '家4けん',
                'ホテル',
              ]
            : isRR
              ? ['1つ所有', '2つ所有', '3つ所有', '4つ所有']
              : [];

          const typeLabel = isProp
            ? '🏠 土地'
            : isRR
              ? '🚂 鉄道'
              : isUtil
                ? space.id === 'electric'
                  ? '💡 でんりょく会社'
                  : '💧 すいどう会社'
                : space.type === 'tax'
                  ? '💸 ぜいきん'
                  : space.type === 'chance'
                    ? '❓ チャンスカード'
                    : space.type === 'communityChest'
                      ? '💝 おたすけカード'
                      : '📍 マス';

          return (
            <Dialog
              title={space.name}
              actions={
                <Button
                  variant="ghost"
                  onClick={() => setShowSpaceDetail(null)}
                >
                  とじる
                </Button>
              }
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  fontSize: 14,
                }}
              >
                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--color-text-light)',
                    marginBottom: 4,
                  }}
                >
                  {typeLabel}
                </div>

                {purchasable && (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '6px 0',
                        borderBottom: '1px solid #eee',
                      }}
                    >
                      <span>💰 かかく</span>
                      <span style={{ fontWeight: 700 }}>${space.price}</span>
                    </div>
                    {space.mortgageValue && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '6px 0',
                          borderBottom: '1px solid #eee',
                        }}
                      >
                        <span>🏦 ていとう（かりられるお金）</span>
                        <span style={{ fontWeight: 700 }}>
                          ${space.mortgageValue}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {isProp && space.houseCost && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    <span>🔨 家をたてるひよう</span>
                    <span style={{ fontWeight: 700 }}>
                      ${space.houseCost} / 1けん
                    </span>
                  </div>
                )}

                {space.rent && space.rent.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                      📋 とまり賃（レンタル料）
                    </div>
                    {space.rent.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '3px 8px',
                          borderRadius: 4,
                          background:
                            ps && ps.houses === i
                              ? 'var(--color-accent)'
                              : i % 2 === 0
                                ? '#f8f8f8'
                                : 'transparent',
                          fontWeight: ps && ps.houses === i ? 700 : 400,
                        }}
                      >
                        <span>{rentLabels[i] ?? `${i}`}</span>
                        <span>${r}</span>
                      </div>
                    ))}
                  </div>
                )}

                {isUtil && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                      📋 とまり賃
                    </div>
                    <div
                      style={{
                        padding: '3px 8px',
                        background: '#f8f8f8',
                        borderRadius: 4,
                      }}
                    >
                      1つ所有: サイコロの目 × 4
                    </div>
                    <div style={{ padding: '3px 8px', marginTop: 2 }}>
                      2つ所有: サイコロの目 × 10
                    </div>
                  </div>
                )}

                {owner && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderTop: '1px solid #eee',
                      marginTop: 4,
                    }}
                  >
                    <span>👤 オーナー</span>
                    <span style={{ fontWeight: 700 }}>
                      {owner.token} {owner.name}
                    </span>
                  </div>
                )}

                {ps && ps.isMortgaged && (
                  <div
                    style={{
                      color: 'var(--color-text-light)',
                      textAlign: 'center',
                    }}
                  >
                    💤 いまお金をかりている状態だよ
                  </div>
                )}

                {ps && isProp && ps.houses > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderTop: '1px solid #eee',
                    }}
                  >
                    <span>🏗️ たてもの</span>
                    <span style={{ fontWeight: 700 }}>
                      {ps.houses === 5 ? '🏨 ホテル' : `🏠 × ${ps.houses}`}
                    </span>
                  </div>
                )}

                {!purchasable && space.type === 'tax' && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                    }}
                  >
                    <span>💸 しはらうお金</span>
                    <span style={{ fontWeight: 700 }}>${space.price}</span>
                  </div>
                )}
              </div>
            </Dialog>
          );
        })()}

      {/* Player detail dialog */}
      {showPlayerDetail &&
        (() => {
          const detailPlayer = state.players.find(
            (p) => p.id === showPlayerDetail,
          );
          if (!detailPlayer) return null;
          const totalAssets = calculateTotalAssets(
            detailPlayer,
            state.propertyStates,
            BOARD_SPACES,
          );
          const ownedProps = detailPlayer.properties.map((id) => ({
            space: BOARD_SPACES.find((s) => s.id === id)!,
            state: state.propertyStates[id],
          }));
          const currentSpaceName =
            BOARD_SPACES[detailPlayer.position]?.name ?? '';
          return (
            <Dialog
              title={`${detailPlayer.token} ${detailPlayer.name}`}
              actions={
                <Button
                  variant="ghost"
                  onClick={() => setShowPlayerDetail(null)}
                >
                  とじる
                </Button>
              }
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  fontSize: 15,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  <span>💰 もちがね</span>
                  <span style={{ fontWeight: 700 }}>
                    ${detailPlayer.money.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  <span>📊 そうしさん</span>
                  <span style={{ fontWeight: 700 }}>
                    ${totalAssets.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  <span>📍 いまのばしょ</span>
                  <span style={{ fontWeight: 700 }}>{currentSpaceName}</span>
                </div>
                {detailPlayer.inJail && (
                  <div
                    style={{ padding: '4px 0', color: 'var(--color-danger)' }}
                  >
                    🔒 刑務所にいるよ（{detailPlayer.jailTurns}/3ターン）
                  </div>
                )}
                {detailPlayer.getOutOfJailCards > 0 && (
                  <div style={{ padding: '4px 0' }}>
                    🎫 刑務所から出られるカード:{' '}
                    {detailPlayer.getOutOfJailCards}枚
                  </div>
                )}
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>
                    🏠 もっている土地（{ownedProps.length}件）
                  </div>
                  {ownedProps.length === 0 && (
                    <div
                      style={{
                        color: 'var(--color-text-light)',
                        fontSize: 14,
                      }}
                    >
                      まだもっていないよ
                    </div>
                  )}
                  {ownedProps.map(({ space, state: ps }) => (
                    <div
                      key={space.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 0',
                        fontSize: 14,
                        borderBottom: '1px solid #f0f0f0',
                      }}
                    >
                      <span>
                        {space.color && (
                          <span
                            style={{
                              display: 'inline-block',
                              width: 10,
                              height: 10,
                              borderRadius: 2,
                              backgroundColor: `var(--color-${space.color})`,
                              marginRight: 6,
                              verticalAlign: 'middle',
                            }}
                          />
                        )}
                        {space.name}
                      </span>
                      <span style={{ color: 'var(--color-text-light)' }}>
                        {ps?.isMortgaged
                          ? '💤'
                          : ps?.houses === 5
                            ? '🏨'
                            : ps?.houses
                              ? '🏠'.repeat(ps.houses)
                              : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Dialog>
          );
        })()}

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

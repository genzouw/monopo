import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  useId,
} from 'react';
import type { Dispatch } from 'react';
import type { GameState, Player } from '../../game/types';
import type { GameAction } from '../../game/actions';
import { MAX_JAIL_TURNS } from '../../game/reducer';
import { calculateTotalAssets, getSpaceById } from '../../game/rules';
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
import SellDialog from '../ActionDialog/SellDialog';
import TradeDialog from '../ActionDialog/TradeDialog';
import BankruptDialog from '../ActionDialog/BankruptDialog';
import ForceBuyDialog from '../ActionDialog/ForceBuyDialog';
import StockDialog from '../ActionDialog/StockDialog';
import LoanDialog from '../ActionDialog/LoanDialog';
import { useSound } from '../../sound/useSound';
import styles from './GameBoard.module.css';

type GameBoardProps = {
  state: GameState;
  dispatch: Dispatch<GameAction>;
};

export default function GameBoard({ state, dispatch }: GameBoardProps) {
  const playersById = useMemo(() => {
    const dict: Record<string, Player> = {};
    for (const p of state.players) {
      dict[p.id] = p;
    }
    return dict;
  }, [state.players]);

  const rollingHintId = useId();
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
  const turnPhaseRef = useRef(state.turnPhase);

  useEffect(() => {
    turnPhaseRef.current = state.turnPhase;
  }, [state.turnPhase]);

  useEffect(() => {
    diceRef.current = state.dice.values;
  }, [state.dice.values]);

  const currentPlayer = state.players[state.currentPlayerIndex];

  const currentSpace = state.board[currentPlayer.position];
  const isPurchasable =
    currentSpace &&
    (currentSpace.type === 'property' ||
      currentSpace.type === 'railroad' ||
      currentSpace.type === 'utility');
  const spaceHasNoOwner =
    isPurchasable && !state.propertyStates[currentSpace.id]?.ownerId;

  const handleRoll = () => {
    if (isRolling) return;
    // Capture position before dispatch changes state
    positionRef.current = currentPlayer.position;
    play('diceRoll');
    setIsRolling(true);
    dispatch({ type: 'ROLL_DICE' });
  };

  const handleRollComplete = useCallback(() => {
    setIsRolling(false);

    // 移動が必要なフェーズのみアニメーション実行
    // （刑務所内ロールで脱出失敗 → endTurn の場合はスキップ）
    if (turnPhaseRef.current !== 'moving') {
      return;
    }

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
  }, [play, dispatch]);

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
    if (isRolling) return;
    // 脱出時のアニメーションのため、現在位置をキャプチャ
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

  const handleSellProperty = (propertyId: string) => {
    dispatch({ type: 'SELL_PROPERTY', propertyId });
  };

  const handleProposeTrade = (offer: import('../../game/types').TradeOffer) => {
    dispatch({ type: 'PROPOSE_TRADE', offer });
  };

  const handleBankrupt = () => {
    play('bankrupt');
    dispatch({ type: 'DECLARE_BANKRUPTCY', creditorId: null });
  };

  // ⚡ Bolt: Memoize filtered array to prevent O(N) recalculations on every render during 60 FPS animations.
  const otherActivePlayers = useMemo(
    () =>
      state.players.filter((p) => p.id !== currentPlayer.id && !p.isBankrupt),
    [state.players, currentPlayer.id],
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
  const showSellDialog =
    state.turnPhase === 'sell' || state.turnPhase === 'forceSell';
  const showTradeDialog = state.turnPhase === 'trade' && !!state.trade;
  const showBankruptDialog = state.turnPhase === 'bankrupt';
  const showForceBuyDialog = state.turnPhase === 'forceBuy';
  // P1 拡張: 株式ダイアログ
  const showStockDialog = state.turnPhase === 'stock' && !!state.stockMarket;
  const stocksEnabled = state.features?.stocks === true;
  // ローン拡張
  const loanEnabled = state.features?.loan === true;
  const [showLoanDialog, setShowLoanDialog] = useState(false);
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
    ? playersById[state.trade.toPlayerId]
    : null;

  // Players with animating position override for minimap
  // ⚡ Bolt: useMemo to keep array reference stable across renders, so MiniMap's React.memo can short-circuit when neither players nor animatingPosition changed.
  const displayPlayers = useMemo(
    () =>
      animatingPosition !== null
        ? state.players.map((p, i) =>
            i === state.currentPlayerIndex
              ? { ...p, position: animatingPosition }
              : p,
          )
        : state.players,
    [animatingPosition, state.players, state.currentPlayerIndex],
  );

  // ⚡ Bolt: Use useCallback to memoize handlers, preventing unnecessary re-renders of heavy pure UI components (MiniMap, PlayerPanel) during animation state updates.
  const handlePlayerClick = useCallback((id: string) => {
    setShowPlayerDetail(id);
  }, []);

  const handleSpaceClick = useCallback((pos: number) => {
    setShowSpaceDetail(pos);
  }, []);

  // ⚡ Bolt: useMemo to keep the children element reference stable, so MiniMap's React.memo isn't bypassed by a fresh JSX object on every render.
  const diceElement = useMemo(
    () =>
      state.dice.rolled ? (
        <Dice
          values={state.dice.values}
          rolling={isRolling}
          onRollComplete={handleRollComplete}
        />
      ) : undefined,
    [state.dice.rolled, state.dice.values, isRolling, handleRollComplete],
  );

  // ⚡ Bolt: useMemo to prevent O(P log P) sorting/mapping of owned properties on every render (e.g. 60 FPS animation) while the player dialog is open.
  const detailPlayerProps = useMemo(() => {
    const detailPlayer = showPlayerDetail
      ? state.players.find((p) => p.id === showPlayerDetail)
      : null;
    if (!detailPlayer) return [];
    const board = state.board;
    const propertyStates = state.propertyStates;
    if (!board || !propertyStates) return [];
    const colorOrder = [
      'brown',
      'lightblue',
      'pink',
      'orange',
      'red',
      'yellow',
      'green',
      'blue',
    ];
    return detailPlayer.properties
      .map((id) => {
        const space = getSpaceById(id, board);
        const propertyState = propertyStates[id];
        return space && propertyState ? { space, state: propertyState } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => {
        const aColorIdx = a.space.color
          ? colorOrder.indexOf(a.space.color)
          : -1;
        const bColorIdx = b.space.color
          ? colorOrder.indexOf(b.space.color)
          : -1;
        const ai = aColorIdx !== -1 ? aColorIdx : colorOrder.length;
        const bi = bColorIdx !== -1 ? bColorIdx : colorOrder.length;
        return ai !== bi ? ai - bi : a.space.position - b.space.position;
      });
  }, [showPlayerDetail, state.players, state.board, state.propertyStates]);

  // ⚡ Bolt: useMemo to prevent sorting/mapping of stocks on every render (e.g. 60 FPS animation) while the player dialog is open.
  const detailPlayerStocks = useMemo(() => {
    const detailPlayer = showPlayerDetail
      ? state.players.find((p) => p.id === showPlayerDetail)
      : null;
    if (!detailPlayer || !detailPlayer.stocks) return [];

    const colorOrder = [
      'brown',
      'lightblue',
      'pink',
      'orange',
      'red',
      'yellow',
      'green',
      'blue',
    ];

    return Object.entries(detailPlayer.stocks)
      .filter(([, shares]) => typeof shares === 'number' && shares > 0)
      .sort(([colorA], [colorB]) => {
        const ai = colorOrder.indexOf(colorA);
        const bi = colorOrder.indexOf(colorB);
        const realA = ai === -1 ? colorOrder.length : ai;
        const realB = bi === -1 ? colorOrder.length : bi;
        return realA - realB;
      });
  }, [showPlayerDetail, state.players]);

  return (
    <div className={styles.gameBoard}>
      <div className={styles.boardSection}>
        <MiniMap
          board={state.board}
          propertyStates={state.propertyStates}
          players={displayPlayers}
          onSpaceClick={handleSpaceClick}
        >
          {diceElement}
        </MiniMap>
      </div>

      <div
        className={`${styles.message} ${state.message ? '' : styles.messageEmpty}`}
        role="status"
      >
        {state.message || ' '}
      </div>

      <PlayerPanel
        allPlayers={state.players}
        currentPlayerIndex={state.currentPlayerIndex}
        onPlayerClick={handlePlayerClick}
      />

      <div className={styles.actions}>
        <div className={styles.primaryAction}>
          {state.turnPhase === 'roll' && !currentPlayer.inJail && (
            <div className={styles.rollButtonWrapper}>
              <Button
                size="large"
                onClick={handleRoll}
                aria-disabled={isRolling}
                aria-describedby={isRolling ? rollingHintId : undefined}
              >
                🎲 さいころをふる！
              </Button>
              {isRolling && (
                <span
                  id={rollingHintId}
                  className={styles.rollingHint}
                  role="status"
                >
                  現在さいころをころがしています。
                </span>
              )}
            </div>
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
        </div>

        {/*
          サブアクション領域は DOM 常駐させ、表示/非表示でレイアウトシフトを
          起こさないようにする（min-height は CSS 側で固定）。
          canSubAction が false のときは中身ボタンを出さず、空のまま高さだけ確保する。
        */}
        <div className={styles.subActions} aria-hidden={!canSubAction}>
          {canSubAction && (
            <>
              <Button
                size="small"
                variant="secondary"
                className={styles.subActionButton}
                onClick={() => dispatch({ type: 'OPEN_BUILD_DIALOG' })}
              >
                🏠 いえをたてる
              </Button>
              <Button
                size="small"
                variant="secondary"
                className={styles.subActionButton}
                onClick={() => dispatch({ type: 'OPEN_SELL_DIALOG' })}
              >
                🏷️ 売りだし
              </Button>
              {otherActivePlayers.length > 0 && (
                <Button
                  size="small"
                  variant="secondary"
                  className={styles.subActionButton}
                  onClick={() => setShowTradeSelect(true)}
                >
                  🤝 こうかん
                </Button>
              )}
              {stocksEnabled && (
                <Button
                  size="small"
                  variant="secondary"
                  className={styles.subActionButton}
                  onClick={() => dispatch({ type: 'OPEN_STOCK_DIALOG' })}
                >
                  📈 おうえんカード
                </Button>
              )}
              {loanEnabled && (
                <Button
                  size="small"
                  variant="secondary"
                  className={styles.subActionButton}
                  onClick={() => setShowLoanDialog(true)}
                >
                  🏦 ローン
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 音声トグル: 画面右上の固定位置に常時表示（操作行の混雑を避ける） */}
      <button
        type="button"
        className={styles.muteButton}
        onClick={toggleMute}
        aria-pressed={muted}
        aria-label={muted ? 'サウンドをオンにする' : 'サウンドをオフにする'}
        title={muted ? 'サウンドをオンにする' : 'サウンドをオフにする'}
      >
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

      {showSellDialog && (
        <SellDialog
          currentPlayer={currentPlayer}
          board={state.board}
          propertyStates={state.propertyStates}
          onSell={handleSellProperty}
          onSellHouse={handleSellHouse}
          onClose={() => dispatch({ type: 'CLOSE_SELL_DIALOG' })}
          forced={state.turnPhase === 'forceSell'}
        />
      )}

      {showLoanDialog && loanEnabled && (
        <LoanDialog
          state={state}
          currentPlayer={currentPlayer}
          onTakeLoan={(amount, loanType) => {
            dispatch({
              type: 'TAKE_LOAN',
              playerId: currentPlayer.id,
              amount,
              loanType,
            });
            setShowLoanDialog(false);
          }}
          onRepayLoan={(amount) => {
            dispatch({
              type: 'REPAY_LOAN',
              playerId: currentPlayer.id,
              amount,
            });
            setShowLoanDialog(false);
          }}
          onClose={() => setShowLoanDialog(false)}
        />
      )}

      {showStockDialog && state.stockMarket && (
        <StockDialog
          currentPlayer={currentPlayer}
          stockMarket={state.stockMarket}
          economyStatus={
            state.features?.macroEconomy ? state.economyStatus : undefined
          }
          onBuy={(color, shares) =>
            dispatch({ type: 'BUY_STOCK', color, shares })
          }
          onSell={(color, shares) =>
            dispatch({ type: 'SELL_STOCK', color, shares })
          }
          onClose={() => dispatch({ type: 'CLOSE_STOCK_DIALOG' })}
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

      {state.turnPhase === 'tradeConfirm' &&
        state.trade &&
        (() => {
          const from = state.trade
            ? playersById[state.trade.fromPlayerId]
            : undefined;
          const to = state.trade
            ? playersById[state.trade.toPlayerId]
            : undefined;
          const offer = state.trade;
          if (!offer) return null;
          const offerSpaces = offer.offerProperties.map((id) =>
            getSpaceById(id, state.board)!,
          );
          const requestSpaces = offer.requestProperties.map((id) =>
            getSpaceById(id, state.board)!,
          );
          return (
            <Dialog
              title={`${to?.token} ${to?.name}へのていあん`}
              actions={
                <>
                  <Button onClick={() => dispatch({ type: 'ACCEPT_TRADE' })}>
                    うけいれる！
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => dispatch({ type: 'REJECT_TRADE' })}
                  >
                    ことわる
                  </Button>
                </>
              }
            >
              <div
                style={{
                  fontSize: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  {from?.token} {from?.name}からのていあん:
                </div>
                {(offerSpaces.length > 0 || offer.offerMoney > 0) && (
                  <div
                    style={{
                      padding: 8,
                      background: '#f0fff0',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      📦 もらえるもの
                    </div>
                    {offerSpaces.map((s) => (
                      <div key={s.id}>・{s.name}</div>
                    ))}
                    {offer.offerMoney > 0 && (
                      <div>・💰 ${offer.offerMoney}</div>
                    )}
                  </div>
                )}
                {(requestSpaces.length > 0 || offer.requestMoney > 0) && (
                  <div
                    style={{
                      padding: 8,
                      background: '#fff0f0',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      📤 わたすもの
                    </div>
                    {requestSpaces.map((s) => (
                      <div key={s.id}>・{s.name}</div>
                    ))}
                    {offer.requestMoney > 0 && (
                      <div>・💰 ${offer.requestMoney}</div>
                    )}
                  </div>
                )}
              </div>
            </Dialog>
          );
        })()}

      {showBankruptDialog && (
        <BankruptDialog
          playerName={currentPlayer.name}
          onConfirm={handleBankrupt}
        />
      )}

      {showForceBuyDialog &&
        currentSpace &&
        (() => {
          const ps = state.propertyStates[currentSpace.id];
          const owner = ps?.ownerId ? playersById[ps.ownerId] : null;
          if (!owner) return null;
          return (
            <ForceBuyDialog
              space={currentSpace}
              currentPlayer={currentPlayer}
              owner={owner}
              houses={ps?.houses ?? 0}
              onBuy={() => dispatch({ type: 'FORCE_BUY' })}
              onDecline={() => dispatch({ type: 'DECLINE_FORCE_BUY' })}
            />
          );
        })()}

      {/* Space detail dialog */}
      {showSpaceDetail !== null &&
        (() => {
          const space = state.board[showSpaceDetail];
          if (!space) return null;
          const ps = state.propertyStates[space.id];
          const owner = ps?.ownerId ? playersById[ps.ownerId] : null;
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
              onClose={() => setShowSpaceDetail(null)}
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
          const detailPlayer = playersById[showPlayerDetail];
          if (!detailPlayer) return null;
          const totalAssets = calculateTotalAssets(
            detailPlayer,
            state.propertyStates,
            state.board,
          );
          const COLOR_LABEL: Record<string, string> = {
            brown: '🟤 ちゃいろ',
            lightblue: '🩵 みずいろ',
            pink: '🩷 ピンク',
            orange: '🟠 オレンジ',
            red: '🔴 あか',
            yellow: '🟡 きいろ',
            green: '🟢 みどり',
            blue: '🔵 あお',
            railroad: '🚂 てつどう',
          };
          const ownedProps = detailPlayerProps;
          const currentSpaceName =
            state.board[detailPlayer.position]?.name ?? '';
          return (
            <Dialog
              title={`${detailPlayer.token} ${detailPlayer.name}`}
              onClose={() => setShowPlayerDetail(null)}
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
                    🔒 刑務所にいるよ（{detailPlayer.jailTurns}/{MAX_JAIL_TURNS}
                    ターン）
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
                {(state.features?.stocks ||
                  (detailPlayer.stocks &&
                    Object.keys(detailPlayer.stocks).length > 0)) && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>
                      📈 おうえんカード（株）
                    </div>
                    {!detailPlayer.stocks ||
                    Object.values(detailPlayer.stocks).every(
                      (shares) => shares === 0,
                    ) ? (
                      <div
                        style={{
                          color: 'var(--color-text-light)',
                          fontSize: 14,
                        }}
                      >
                        まだもっていないよ
                      </div>
                    ) : (
                      detailPlayerStocks.map(([color, shares]) => (
                          <div
                            key={color}
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
                              {color !== 'railroad' && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: 10,
                                    height: 10,
                                    borderRadius: 2,
                                    backgroundColor: `var(--color-${color})`,
                                    marginRight: 6,
                                    verticalAlign: 'middle',
                                  }}
                                />
                              )}
                              {COLOR_LABEL[color] || color}
                            </span>
                            <span>{shares}まい</span>
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>
            </Dialog>
          );
        })()}

      {/* Trade target selection modal */}
      {showTradeSelect && (
        <Dialog
          title="だれとこうかんする？"
          onClose={() => setShowTradeSelect(false)}
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

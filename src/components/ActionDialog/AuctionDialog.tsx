import { useMemo, useId } from 'react';
import type { AuctionState, Player } from '../../game/types';
import { BOARD_SPACES } from '../../game/board';
import { getSpaceById } from '../../game/rules';
import Dialog from '../common/Dialog';
import Button from '../common/Button';
import styles from './ActionDialog.module.css';

const MAX_BID_INCREMENT = 100;
const NO_MONEY_HINT_TEXT = 'おかねがたりないよ';

type AuctionDialogProps = {
  auction: AuctionState;
  players: Player[];
  currentPlayer: Player;
  onBid: (amount: number) => void;
  onPass: () => void;
};

export default function AuctionDialog({
  auction,
  players,
  onBid,
  onPass,
}: AuctionDialogProps) {
  const playersById = useMemo(() => {
    const dict: Record<string, Player> = {};
    for (const p of players) {
      dict[p.id] = p;
    }
    return dict;
  }, [players]);

  const noMoneyHintId = useId();
  const space = getSpaceById(auction.propertyId, BOARD_SPACES);
  const currentBidder = auction.currentBidderId
    ? playersById[auction.currentBidderId]
    : null;
  const activePlayer = players[auction.activePlayerIndex];
  // ツールチップ（title）とスクリーンリーダー向け説明（aria-describedby）で
  // 「おかねが足りない」判定を必ず同じ条件から算出し、両者の食い違いを防ぐ。
  // activePlayer が存在しない場合はお金の問題ではないため、この判定には含めない。
  const isNoMoneyFor10 =
    !!activePlayer && activePlayer.money < auction.currentBid + 10;
  const isNoMoneyFor50 =
    !!activePlayer && activePlayer.money < auction.currentBid + 50;
  const isNoMoneyForMax =
    !!activePlayer &&
    activePlayer.money < auction.currentBid + MAX_BID_INCREMENT;

  return (
    <Dialog title="オークション！">
      <div className={styles.auctionInfo}>
        <div className={styles.propertyName}>{space?.name ?? ''}</div>
        <div className={styles.bidAmount}>${auction.currentBid}</div>
        <div className={styles.bidder}>
          {currentBidder
            ? `${currentBidder.token} ${currentBidder.name}がリード中`
            : `開始価格 $${auction.currentBid}（だれかビッドしてね！）`}
        </div>
        <div
          className={styles.bidder}
          style={{ marginTop: 8, fontWeight: 700, fontSize: 16 }}
        >
          {activePlayer?.token} {activePlayer?.name}のばん
        </div>
        <div className={styles.bidder}>
          もちがね: ${activePlayer?.money.toLocaleString()}
        </div>
      </div>
      <div className={styles.bidButtons}>
        <Button
          size="small"
          onClick={() => onBid(10)}
          aria-label="10ドル追加"
          aria-disabled={
            !activePlayer || activePlayer.money < auction.currentBid + 10
          }
          aria-describedby={isNoMoneyFor10 ? noMoneyHintId : undefined}
          title={isNoMoneyFor10 ? NO_MONEY_HINT_TEXT : undefined}
        >
          +$10
        </Button>
        <Button
          size="small"
          onClick={() => onBid(50)}
          aria-label="50ドル追加"
          aria-disabled={
            !activePlayer || activePlayer.money < auction.currentBid + 50
          }
          aria-describedby={isNoMoneyFor50 ? noMoneyHintId : undefined}
          title={isNoMoneyFor50 ? NO_MONEY_HINT_TEXT : undefined}
        >
          +$50
        </Button>
        <Button
          size="small"
          onClick={() => onBid(MAX_BID_INCREMENT)}
          aria-label={`${MAX_BID_INCREMENT}ドル追加`}
          aria-disabled={
            !activePlayer ||
            activePlayer.money < auction.currentBid + MAX_BID_INCREMENT
          }
          aria-describedby={isNoMoneyForMax ? noMoneyHintId : undefined}
          title={isNoMoneyForMax ? NO_MONEY_HINT_TEXT : undefined}
        >
          +${MAX_BID_INCREMENT}
        </Button>
        <Button size="small" variant="secondary" onClick={onPass}>
          パス
        </Button>
      </div>
      {isNoMoneyForMax && (
        <div id={noMoneyHintId} className={styles.noMoneyHint} role="status">
          {NO_MONEY_HINT_TEXT}
        </div>
      )}
    </Dialog>
  );
}

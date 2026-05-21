import type { AuctionState, Player } from '../../game/types'
import { BOARD_SPACES } from '../../game/board'
import { getSpaceById } from '../../game/rules'
import Dialog from '../common/Dialog'
import Button from '../common/Button'
import styles from './ActionDialog.module.css'

const MAX_BID_INCREMENT = 100
const NO_MONEY_HINT_TEXT = 'おかねがたりないよ'

type AuctionDialogProps = {
  auction: AuctionState
  players: Player[]
  currentPlayer: Player
  onBid: (amount: number) => void
  onPass: () => void
}

export default function AuctionDialog({
  auction,
  players,
  onBid,
  onPass,
}: AuctionDialogProps) {
  const space = getSpaceById(auction.propertyId, BOARD_SPACES)
  const currentBidder = auction.currentBidderId
    ? players.find((p) => p.id === auction.currentBidderId)
    : null
  const activePlayer = players[auction.activePlayerIndex]

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
          disabled={
            !activePlayer || activePlayer.money < auction.currentBid + 10
          }
          aria-describedby={
            activePlayer && activePlayer.money < auction.currentBid + 10
              ? 'auction-no-money-hint'
              : undefined
          }
        >
          +$10
        </Button>
        <Button
          size="small"
          onClick={() => onBid(50)}
          disabled={
            !activePlayer || activePlayer.money < auction.currentBid + 50
          }
          aria-describedby={
            activePlayer && activePlayer.money < auction.currentBid + 50
              ? 'auction-no-money-hint'
              : undefined
          }
        >
          +$50
        </Button>
        <Button
          size="small"
          onClick={() => onBid(MAX_BID_INCREMENT)}
          disabled={
            !activePlayer ||
            activePlayer.money < auction.currentBid + MAX_BID_INCREMENT
          }
          aria-describedby={
            activePlayer &&
            activePlayer.money < auction.currentBid + MAX_BID_INCREMENT
              ? 'auction-no-money-hint'
              : undefined
          }
        >
          +${MAX_BID_INCREMENT}
        </Button>
        <Button size="small" variant="secondary" onClick={onPass}>
          パス
        </Button>
      </div>
      {activePlayer &&
        activePlayer.money < auction.currentBid + MAX_BID_INCREMENT && (
          <div
            id="auction-no-money-hint"
            className={styles.noMoneyHint}
            role="status"
          >
            {NO_MONEY_HINT_TEXT}
          </div>
        )}
    </Dialog>
  )
}

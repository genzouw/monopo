import type { AuctionState, Player } from '../../game/types'
import { BOARD_SPACES } from '../../game/board'
import Dialog from '../common/Dialog'
import Button from '../common/Button'
import styles from './ActionDialog.module.css'

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
  const space = BOARD_SPACES.find((s) => s.id === auction.propertyId)
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
            : 'まだだれもビッドしていないよ'}
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
        >
          +$10
        </Button>
        <Button
          size="small"
          onClick={() => onBid(50)}
          disabled={
            !activePlayer || activePlayer.money < auction.currentBid + 50
          }
        >
          +$50
        </Button>
        <Button
          size="small"
          onClick={() => onBid(100)}
          disabled={
            !activePlayer || activePlayer.money < auction.currentBid + 100
          }
        >
          +$100
        </Button>
        <Button size="small" variant="secondary" onClick={onPass}>
          パス
        </Button>
      </div>
    </Dialog>
  )
}

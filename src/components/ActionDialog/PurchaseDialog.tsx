import type { BoardSpace, Player } from '../../game/types'
import Dialog from '../common/Dialog'
import Button from '../common/Button'
import styles from './ActionDialog.module.css'

type PurchaseDialogProps = {
  space: BoardSpace
  currentPlayer: Player
  onBuy: () => void
  onDecline: () => void
}

export default function PurchaseDialog({
  space,
  currentPlayer,
  onBuy,
  onDecline,
}: PurchaseDialogProps) {
  const canAfford = currentPlayer.money >= (space.price ?? 0)
  return (
    <Dialog
      title="かいますか？"
      actions={
        <>
          <Button onClick={onBuy} disabled={!canAfford}>
            ${space.price}で買う！
          </Button>
          <Button variant="secondary" onClick={onDecline}>
            買わない（オークション）
          </Button>
        </>
      }
    >
      <div className={styles.propertyInfo}>
        <div className={styles.propertyName}>{space.name}</div>
        <div className={styles.propertyPrice}>ねだん: ${space.price}</div>
        <div className={styles.propertyPrice}>
          もってるおかね: ${currentPlayer.money.toLocaleString()}
        </div>
        {!canAfford && (
          <div
            style={{ color: 'var(--color-danger)', fontSize: 13, marginTop: 4 }}
          >
            おかねがたりないよ
          </div>
        )}
      </div>
    </Dialog>
  )
}

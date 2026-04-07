import type { BoardSpace, Player } from '../../game/types'
import Dialog from '../common/Dialog'
import Button from '../common/Button'
import styles from './ActionDialog.module.css'

type ForceBuyDialogProps = {
  space: BoardSpace
  currentPlayer: Player
  owner: Player
  houses: number
  onBuy: () => void
  onDecline: () => void
}

export default function ForceBuyDialog({
  space,
  currentPlayer,
  owner,
  houses,
  onBuy,
  onDecline,
}: ForceBuyDialogProps) {
  const cost = (space.price ?? 0) * 5
  const toOwner = Math.floor(cost * 0.6)
  const houseSellBack =
    houses > 0 && space.houseCost
      ? Math.floor(space.houseCost * houses * 0.5)
      : 0

  return (
    <Dialog
      title="5ばいがいする？"
      actions={
        <>
          <Button onClick={onBuy}>${cost.toLocaleString()}で買いとる！</Button>
          <Button variant="secondary" onClick={onDecline}>
            やめておく
          </Button>
        </>
      }
    >
      <div className={styles.propertyInfo}>
        <div className={styles.propertyName}>{space.name}</div>
        <div className={styles.propertyPrice}>もちぬし: {owner.name}</div>
        <div className={styles.propertyPrice}>
          5ばいがいの金がく: ${cost.toLocaleString()}
        </div>
        <div
          className={styles.propertyPrice}
          style={{ fontSize: 12, opacity: 0.7 }}
        >
          （{owner.name}に${toOwner.toLocaleString()}
          {houseSellBack > 0 && ` + おうち分$${houseSellBack.toLocaleString()}`}
          、のこりは銀行へ）
        </div>
        {houses > 0 && (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            ※ おうち({houses}けん)はとりこわされるよ
          </div>
        )}
        <div className={styles.propertyPrice} style={{ marginTop: 8 }}>
          もってるおかね: ${currentPlayer.money.toLocaleString()}
        </div>
      </div>
    </Dialog>
  )
}

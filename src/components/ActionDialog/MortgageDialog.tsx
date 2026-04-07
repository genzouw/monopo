import type { BoardSpace, Player, PropertyState } from '../../game/types'
import { canMortgage, canUnmortgage } from '../../game/rules'
import Dialog from '../common/Dialog'
import Button from '../common/Button'
import styles from './ActionDialog.module.css'

type MortgageDialogProps = {
  currentPlayer: Player
  board: BoardSpace[]
  propertyStates: Record<string, PropertyState>
  onMortgage: (propertyId: string) => void
  onUnmortgage: (propertyId: string) => void
  onClose: () => void
}

export default function MortgageDialog({
  currentPlayer,
  board,
  propertyStates,
  onMortgage,
  onUnmortgage,
  onClose,
}: MortgageDialogProps) {
  const ownedProperties = currentPlayer.properties
    .map((id) => board.find((s) => s.id === id))
    .filter((s): s is BoardSpace => !!s && !!s.mortgageValue)

  return (
    <Dialog
      title="ていとう"
      actions={
        <Button variant="secondary" onClick={onClose}>
          とじる
        </Button>
      }
    >
      <div className={styles.buildList}>
        {ownedProperties.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 16,
              color: 'var(--color-text-light)',
            }}
          >
            ぶっけんをもっていないよ
          </div>
        )}
        {ownedProperties.map((space) => {
          const propState = propertyStates[space.id]
          const isMortgaged = propState?.isMortgaged ?? false
          const canDoMortgage = canMortgage(
            space.id,
            currentPlayer.id,
            propertyStates,
            board,
          )
          const canDoUnmortgage = canUnmortgage(
            space.id,
            currentPlayer.id,
            currentPlayer,
            propertyStates,
            board,
          )
          const unmortgageCost = Math.floor((space.mortgageValue ?? 0) * 1.1)
          return (
            <div key={space.id} className={styles.buildItem}>
              <div>
                <div className={styles.buildItemName}>
                  {isMortgaged ? '🔒 ' : ''}
                  {space.name}
                </div>
                <div className={styles.buildItemInfo}>
                  {isMortgaged
                    ? `かえすコスト: $${unmortgageCost}`
                    : `かりられるがく: $${space.mortgageValue}`}
                </div>
              </div>
              {isMortgaged ? (
                <Button
                  size="small"
                  onClick={() => onUnmortgage(space.id)}
                  disabled={!canDoUnmortgage}
                >
                  かえす
                </Button>
              ) : (
                <Button
                  size="small"
                  variant="danger"
                  onClick={() => onMortgage(space.id)}
                  disabled={!canDoMortgage}
                >
                  かりる
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </Dialog>
  )
}

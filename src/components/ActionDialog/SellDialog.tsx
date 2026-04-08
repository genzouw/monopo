import type {
  BoardSpace,
  ColorGroup,
  Player,
  PropertyState,
} from '../../game/types'
import Dialog from '../common/Dialog'
import Button from '../common/Button'
import styles from './ActionDialog.module.css'

const COLOR_MAP: Record<ColorGroup, string> = {
  brown: 'var(--color-brown)',
  lightblue: 'var(--color-lightblue)',
  pink: 'var(--color-pink)',
  orange: 'var(--color-orange)',
  red: 'var(--color-red)',
  yellow: 'var(--color-yellow)',
  green: 'var(--color-green)',
  blue: 'var(--color-blue)',
  railroad: '#555',
}

const COLOR_ORDER: ColorGroup[] = [
  'brown',
  'lightblue',
  'pink',
  'orange',
  'red',
  'yellow',
  'green',
  'blue',
  'railroad',
]

type SellDialogProps = {
  currentPlayer: Player
  board: BoardSpace[]
  propertyStates: Record<string, PropertyState>
  onSell: (propertyId: string) => void
  onSellHouse: (propertyId: string) => void
  onClose: () => void
  forced?: boolean
}

export default function SellDialog({
  currentPlayer,
  board,
  propertyStates,
  onSell,
  onSellHouse,
  onClose,
  forced = false,
}: SellDialogProps) {
  const ownedProperties = currentPlayer.properties
    .map((id) => board.find((s) => s.id === id))
    .filter((s): s is BoardSpace => !!s)
    .sort((a, b) => {
      const ai = a.color ? COLOR_ORDER.indexOf(a.color) : COLOR_ORDER.length
      const bi = b.color ? COLOR_ORDER.indexOf(b.color) : COLOR_ORDER.length
      return ai - bi
    })

  const title = forced
    ? '⚠️ お金がたりないよ！物件を売ろう！'
    : '🏷️ 物件を売りだす'

  return (
    <Dialog
      title={title}
      actions={
        forced ? (
          <div
            style={{
              fontSize: 13,
              color: 'var(--color-danger)',
              textAlign: 'center',
            }}
          >
            💰 もちがね: ${currentPlayer.money.toLocaleString()}
            <br />
            プラスになるまで売りだしてね
          </div>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            とじる
          </Button>
        )
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
            売れる物件がないよ
          </div>
        )}
        {ownedProperties.map((space) => {
          const propState = propertyStates[space.id]
          const houses = propState?.houses ?? 0
          const hasHouses = houses > 0
          const houseLabel =
            houses === 5 ? '🏨' : houses > 0 ? `🏠×${houses}` : ''
          const sellPrice = Math.floor((space.houseCost ?? 0) / 2)
          return (
            <div key={space.id} className={styles.buildItem}>
              {space.color && (
                <div
                  style={{
                    width: 6,
                    borderRadius: 3,
                    background: COLOR_MAP[space.color],
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div className={styles.buildItemName}>
                  {space.name} {houseLabel}
                </div>
                <div className={styles.buildItemInfo}>
                  {hasHouses
                    ? `家を売る: +$${sellPrice}`
                    : `購入価格: $${space.price}`}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', alignSelf: 'center' }}>
                {hasHouses ? (
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => onSellHouse(space.id)}
                  >
                    家を売る
                  </Button>
                ) : (
                  <Button
                    size="small"
                    variant="danger"
                    onClick={() => onSell(space.id)}
                  >
                    売りだす
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Dialog>
  )
}

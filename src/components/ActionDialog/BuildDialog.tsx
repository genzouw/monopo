import type {
  BoardSpace,
  ColorGroup,
  Player,
  PropertyState,
} from '../../game/types'
import { canBuildHouse, canSellHouse } from '../../game/rules'
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
]

type BuildDialogProps = {
  currentPlayer: Player
  board: BoardSpace[]
  propertyStates: Record<string, PropertyState>
  onBuild: (propertyId: string) => void
  onSell: (propertyId: string) => void
  onClose: () => void
}

const HOUSE_LABELS = ['なし', '🏠', '🏠🏠', '🏠🏠🏠', '🏠🏠🏠🏠', '🏨']

export default function BuildDialog({
  currentPlayer,
  board,
  propertyStates,
  onBuild,
  onSell,
  onClose,
}: BuildDialogProps) {
  const ownedProperties = currentPlayer.properties
    .map((id) => board.find((s) => s.id === id))
    .filter(
      (s): s is BoardSpace => !!s && s.type === 'property' && !!s.houseCost,
    )
    .sort((a, b) => {
      const ai = COLOR_ORDER.indexOf(a.color as ColorGroup)
      const bi = COLOR_ORDER.indexOf(b.color as ColorGroup)
      return ai - bi
    })

  return (
    <Dialog
      title="いえをたてる・うる"
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
            たてられるぶっけんがないよ
          </div>
        )}
        {ownedProperties.map((space) => {
          const propState = propertyStates[space.id]
          const houses = propState?.houses ?? 0
          const canBuild = canBuildHouse(
            space.id,
            currentPlayer.id,
            propertyStates,
            board,
          )
          const canSell = canSellHouse(
            space.id,
            currentPlayer.id,
            propertyStates,
            board,
          )
          const canAffordBuild = currentPlayer.money >= (space.houseCost ?? 0)
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
                <div className={styles.buildItemName}>{space.name}</div>
                <div className={styles.buildItemInfo}>
                  {HOUSE_LABELS[houses]} たてるコスト: ${space.houseCost}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  marginLeft: 'auto',
                  alignItems: 'center',
                }}
              >
                <Button
                  size="small"
                  onClick={() => onBuild(space.id)}
                  disabled={!canBuild || !canAffordBuild}
                >
                  たてる
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => onSell(space.id)}
                  disabled={!canSell}
                >
                  うる
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </Dialog>
  )
}

import type {
  BoardSpace,
  Player,
  PropertyState,
  ColorGroup,
} from '../../game/types'
import styles from './Board.module.css'

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

/** プレイヤーごとの所有マス背景色（薄い色） */
const OWNER_BG: Record<string, string> = {
  p1: 'rgba(255, 107, 107, 0.25)',
  p2: 'rgba(78, 205, 196, 0.25)',
  p3: 'rgba(255, 230, 109, 0.35)',
  p4: 'rgba(155, 89, 182, 0.25)',
}

/** マスタイプに応じたアイコン */
function getSpaceIcon(space: BoardSpace): string | null {
  if (space.type === 'railroad') return '🚂'
  if (space.type === 'utility') {
    return space.id === 'electric' ? '💡' : '💧'
  }
  if (space.type === 'chance') return '❓'
  if (space.type === 'communityChest') return '💝'
  if (space.type === 'tax') return '💸'
  if (space.id === 'go') return '▶️'
  if (space.id === 'jail') return '🔒'
  if (space.id === 'free-parking') return '🅿️'
  if (space.id === 'go-to-jail') return '👮'
  return null
}

type MiniMapProps = {
  board: BoardSpace[]
  propertyStates: Record<string, PropertyState>
  players: Player[]
  onSpaceClick: (position: number) => void
  children?: React.ReactNode
}

function getGridPosition(position: number): { row: number; col: number } {
  if (position <= 10) return { row: 11, col: 11 - position }
  if (position <= 20) return { row: 11 - (position - 10), col: 1 }
  if (position <= 30) return { row: 1, col: position - 20 + 1 }
  return { row: position - 30 + 1, col: 11 }
}

/** 色バーを経路の内側に配置するスタイル */
function getColorBarPosition(position: number): React.CSSProperties {
  if (position <= 10) {
    // 下辺: 内側 = 上
    return { top: 0, left: 0, right: 0 }
  }
  if (position <= 20) {
    // 左辺: 内側 = 右
    return { top: 0, bottom: 0, right: 0 }
  }
  if (position <= 30) {
    // 上辺: 内側 = 下
    return { bottom: 0, left: 0, right: 0 }
  }
  // 右辺: 内側 = 左
  return { top: 0, bottom: 0, left: 0 }
}

function isHorizontalEdge(position: number): boolean {
  return position <= 10 || (position > 20 && position <= 30)
}

export default function MiniMap({
  board,
  propertyStates,
  players,
  onSpaceClick,
  children,
}: MiniMapProps) {
  const activePlayers = players.filter((p) => !p.isBankrupt)
  return (
    <div className={styles.miniMap}>
      <div className={styles.miniMapBoard}>
        {board.map((space) => {
          const { row, col } = getGridPosition(space.position)
          const playersHere = activePlayers.filter(
            (p) => p.position === space.position,
          )
          const propState = propertyStates[space.id]
          const icon = getSpaceIcon(space)
          const ownerId = propState?.ownerId
          const ownerBg = ownerId
            ? (OWNER_BG[ownerId] ?? 'rgba(150,150,150,0.2)')
            : undefined

          return (
            <div
              key={space.id}
              className={styles.miniSpace}
              style={{
                gridRow: row,
                gridColumn: col,
                background:
                  ownerBg ??
                  (space.position === 0
                    ? '#e8f5e9'
                    : space.type === 'chance'
                      ? '#fff3e0'
                      : 'var(--color-white)'),
              }}
              onClick={() => onSpaceClick(space.position)}
            >
              {space.color && (
                <div
                  className={`${styles.miniSpaceColor} ${isHorizontalEdge(space.position) ? styles.miniSpaceColorH : styles.miniSpaceColorV}`}
                  style={{
                    background: COLOR_MAP[space.color],
                    ...getColorBarPosition(space.position),
                  }}
                />
              )}
              {icon && !ownerId && (
                <span className={styles.miniSpaceIcon}>{icon}</span>
              )}
              {ownerId && (
                <span className={styles.miniOwnerToken}>
                  {players.find((p) => p.id === ownerId)?.token}
                </span>
              )}
              {propState && propState.houses > 0 && (
                <span className={styles.miniHouses}>
                  {propState.houses === 5
                    ? '🏨'
                    : '🏠'.repeat(propState.houses)}
                </span>
              )}
              {playersHere.map((p, i) => (
                <span
                  key={p.id}
                  className={styles.miniToken}
                  style={{ top: `${i * 10}px`, left: `${i * 6}px` }}
                >
                  {p.token}
                </span>
              ))}
            </div>
          )
        })}
        <div className={styles.miniCenter}>{children ?? '🎲'}</div>
      </div>
    </div>
  )
}

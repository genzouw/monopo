import { memo } from 'react'
import type { BoardSpace, Player, PropertyState } from '../../game/types'
import { getOwnerBg } from '../common/playerColors'
import styles from './Board.module.css'

// Re-use logic from MiniMap.tsx
type ColorGroup = import('../../game/types').ColorGroup

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

function getColorBarPosition(position: number): React.CSSProperties {
  if (position <= 10) return { top: 0, left: 0, right: 0 }
  if (position <= 20) return { top: 0, bottom: 0, right: 0 }
  if (position <= 30) return { bottom: 0, left: 0, right: 0 }
  return { top: 0, bottom: 0, left: 0 }
}

function isHorizontalEdge(position: number): boolean {
  return position <= 10 || (position > 20 && position <= 30)
}

type MemoizedMiniSpaceProps = {
  space: BoardSpace
  row: number
  col: number
  playersHere: Player[]
  propState?: PropertyState
  allPlayers: Player[]
  onSpaceClick: (position: number) => void
}

const areEqual = (
  prevProps: MemoizedMiniSpaceProps,
  nextProps: MemoizedMiniSpaceProps,
) => {
  if (prevProps.playersHere.length !== nextProps.playersHere.length)
    return false
  for (let i = 0; i < prevProps.playersHere.length; i++) {
    if (prevProps.playersHere[i].id !== nextProps.playersHere[i].id)
      return false
  }

  const prevPropState = prevProps.propState
  const nextPropState = nextProps.propState
  if (prevPropState !== nextPropState) {
    if (!prevPropState || !nextPropState) return false
    if (
      prevPropState.ownerId !== nextPropState.ownerId ||
      prevPropState.houses !== nextPropState.houses ||
      prevPropState.isMortgaged !== nextPropState.isMortgaged
    ) {
      return false
    }
  }

  // space, row, col, allPlayers, onSpaceClick are assumed stable
  // allPlayers is only used for `allPlayers.find` for token, which only matters if ownerId changes
  return true
}

export const MemoizedMiniSpace = memo(function MemoizedMiniSpace({
  space,
  row,
  col,
  playersHere,
  propState,
  allPlayers,
  onSpaceClick,
}: MemoizedMiniSpaceProps) {
  const icon = getSpaceIcon(space)
  const ownerId = propState?.ownerId
  const ownerBg = ownerId ? getOwnerBg(ownerId) : undefined

  return (
    <div
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
      {icon && (
        <span className={styles.miniSpaceIcon} aria-hidden="true">
          {icon}
        </span>
      )}
      {ownerId && (
        <span className={styles.miniOwnerToken}>
          {allPlayers.find((p) => p.id === ownerId)?.token}
        </span>
      )}
      {propState && propState.houses > 0 && (
        <span className={styles.miniHouses}>
          {propState.houses === 5 ? '🏨' : '🏠'.repeat(propState.houses)}
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
}, areEqual)

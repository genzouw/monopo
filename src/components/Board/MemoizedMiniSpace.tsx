import { memo } from 'react'
import type {
  BoardSpace,
  ColorGroup,
  Player,
  PropertyState,
} from '../../game/types'
import { getOwnerBg } from '../common/playerColors'
import styles from './Board.module.css'

// Re-use logic from MiniMap.tsx
const COLOR_MAP: Record<ColorGroup, string> = {
  brown: 'var(--color-brown)',
  lightblue: 'var(--color-lightblue)',
  pink: 'var(--color-pink)',
  orange: 'var(--color-orange)',
  red: 'var(--color-red)',
  yellow: 'var(--color-yellow)',
  green: 'var(--color-green)',
  blue: 'var(--color-blue)',
  railroad: 'var(--color-railroad)',
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
    if (
      prevProps.playersHere[i].id !== nextProps.playersHere[i].id ||
      prevProps.playersHere[i].token !== nextProps.playersHere[i].token
    )
      return false
  }

  const prevPropState = prevProps.propState
  const nextPropState = nextProps.propState
  if (prevPropState !== nextPropState) {
    if (!prevPropState || !nextPropState) return false
    if (
      prevPropState.ownerId !== nextPropState.ownerId ||
      prevPropState.houses !== nextPropState.houses
    ) {
      return false
    }
  }

  const prevOwnerId = prevPropState?.ownerId
  const nextOwnerId = nextPropState?.ownerId
  if (prevOwnerId && nextOwnerId && prevOwnerId === nextOwnerId) {
    const prevOwner = prevProps.allPlayers.find((p) => p.id === prevOwnerId)
    const nextOwner = nextProps.allPlayers.find((p) => p.id === nextOwnerId)
    if (
      prevOwner?.name !== nextOwner?.name ||
      prevOwner?.token !== nextOwner?.token
    ) {
      return false
    }
  }

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
  const ownerName = ownerId
    ? allPlayers.find((p) => p.id === ownerId)?.name
    : undefined
  const houses = propState?.houses ?? 0
  const ariaLabel = [
    space.name,
    ownerName && `所有者: ${ownerName}`,
    houses > 0 && (houses === 5 ? 'ホテル' : `家${houses}軒`),
    playersHere.length > 0 && `プレイヤー${playersHere.length}人滞在中`,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={styles.miniSpace}
      style={{
        gridRow: row,
        gridColumn: col,
        background:
          ownerBg ??
          (space.position === 0
            ? 'var(--color-go-square)'
            : space.type === 'chance'
              ? 'var(--color-chance-square)'
              : 'var(--color-white)'),
      }}
      onClick={() => onSpaceClick(space.position)}
      aria-label={ariaLabel}
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
    </button>
  )
}, areEqual)

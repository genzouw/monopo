import { memo } from 'react'
import type { BoardSpace, Player, PropertyState } from '../../game/types'
import styles from './Board.module.css'

import { MemoizedMiniSpace } from './MemoizedMiniSpace'

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

const MiniMap = memo(function MiniMap({
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

          return (
            <MemoizedMiniSpace
              key={space.id}
              space={space}
              row={row}
              col={col}
              playersHere={playersHere}
              propState={propState}
              allPlayers={players}
              onSpaceClick={onSpaceClick}
            />
          )
        })}
        <div className={styles.miniCenter}>{children ?? '🎲'}</div>
      </div>
    </div>
  )
})

export default MiniMap

import { memo } from 'react'
import type { Player } from '../../game/types'
import { getOwnerBg } from '../common/playerColors'
import styles from './PlayerPanel.module.css'

type PlayerPanelProps = {
  allPlayers: Player[]
  currentPlayerIndex: number
  onPlayerClick?: (playerId: string) => void
}

const PlayerPanel = memo(function PlayerPanel({
  allPlayers,
  currentPlayerIndex,
  onPlayerClick,
}: PlayerPanelProps) {
  return (
    <div className={styles.allPlayers}>
      {allPlayers.map((player, idx) => (
        <div
          key={player.id}
          className={`${styles.playerChip} ${idx === currentPlayerIndex ? styles.playerChipActive : ''} ${player.isBankrupt ? styles.playerChipBankrupt : ''}`}
          onClick={() => onPlayerClick?.(player.id)}
          style={{ cursor: 'pointer', background: getOwnerBg(player.id) }}
        >
          <span>{player.token}</span>
          <span>${player.money.toLocaleString()}</span>
          {player.inJail && <span className={styles.jailBadge}>🔒</span>}
        </div>
      ))}
    </div>
  )
})

export default PlayerPanel

import type { Player } from '../../game/types'
import styles from './PlayerPanel.module.css'

type PlayerPanelProps = {
  currentPlayer: Player
  allPlayers: Player[]
  currentPlayerIndex: number
  onPlayerClick?: (playerId: string) => void
}

export default function PlayerPanel({
  currentPlayer,
  allPlayers,
  currentPlayerIndex,
  onPlayerClick,
}: PlayerPanelProps) {
  return (
    <>
      <div className={styles.currentPlayer}>
        <span className={styles.token}>{currentPlayer.token}</span>
        <div className={styles.info}>
          <div className={styles.name}>{currentPlayer.name}のばん</div>
          <div className={styles.money}>
            💰 ${currentPlayer.money.toLocaleString()}
          </div>
        </div>
        {currentPlayer.inJail && <span className={styles.jailBadge}>🔒</span>}
      </div>
      <div className={styles.allPlayers}>
        {allPlayers.map((player, idx) => (
          <div
            key={player.id}
            className={`${styles.playerChip} ${idx === currentPlayerIndex ? styles.playerChipActive : ''} ${player.isBankrupt ? styles.playerChipBankrupt : ''}`}
            onClick={() => onPlayerClick?.(player.id)}
            style={{ cursor: 'pointer' }}
          >
            <span>{player.token}</span>
            <span>${player.money.toLocaleString()}</span>
            {player.inJail && <span className={styles.jailBadge}>🔒</span>}
          </div>
        ))}
      </div>
    </>
  )
}

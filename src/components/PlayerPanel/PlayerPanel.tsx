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
          role="button"
          tabIndex={0}
          aria-label={`${player.token} ${player.name} 所持金 ${player.money}ドル ${player.inJail ? '刑務所に入っています' : ''} ${player.isBankrupt ? '破産しています' : ''}`}
          aria-current={idx === currentPlayerIndex ? 'true' : 'false'}
          className={`${styles.playerChip} ${idx === currentPlayerIndex ? styles.playerChipActive : ''} ${player.isBankrupt ? styles.playerChipBankrupt : ''}`}
          onClick={() => onPlayerClick?.(player.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onPlayerClick?.(player.id)
            }
          }}
          style={{ background: getOwnerBg(player.id) }}
        >
          <span aria-hidden="true">{player.token}</span>
          <span aria-hidden="true">${player.money.toLocaleString()}</span>
          {player.inJail && (
            <span className={styles.jailBadge} aria-hidden="true">
              🔒
            </span>
          )}
        </div>
      ))}
    </div>
  )
})

export default PlayerPanel

import { memo } from 'react';
import type { Player } from '../../game/types';
import { getOwnerBg } from '../common/playerColors';
import styles from './PlayerPanel.module.css';

type PlayerPanelProps = {
  allPlayers: Player[];
  currentPlayerIndex: number;
  onPlayerClick?: (playerId: string) => void;
};

const PlayerPanel = memo(function PlayerPanel({
  allPlayers,
  currentPlayerIndex,
  onPlayerClick,
}: PlayerPanelProps) {
  return (
    <div className={styles.allPlayers}>
      {allPlayers.map((player, idx) => (
        <button
          key={player.id}
          type="button"
          aria-label={
            `${player.token} ${player.name} 所持金 ${player.money.toLocaleString()}ドル` +
            (player.inJail ? ' 刑務所に入っています' : '') +
            (player.isBankrupt ? ' 破産しています' : '') +
            (onPlayerClick ? ' 詳細を見る' : '')
          }
          aria-current={idx === currentPlayerIndex ? 'true' : 'false'}
          aria-disabled={!onPlayerClick}
          className={`${styles.playerChip} ${idx === currentPlayerIndex ? styles.playerChipActive : ''} ${player.isBankrupt ? styles.playerChipBankrupt : ''}`}
          disabled={!onPlayerClick}
          onClick={() => onPlayerClick?.(player.id)}
          style={{ background: getOwnerBg(player.id) }}
          title={onPlayerClick ? `${player.name}の詳細を見る` : undefined}
        >
          <span aria-hidden="true">{player.token}</span>
          <span aria-hidden="true">${player.money.toLocaleString()}</span>
          {player.inJail && (
            <span className={styles.jailBadge} aria-hidden="true">
              🔒
            </span>
          )}
        </button>
      ))}
    </div>
  );
});

export default PlayerPanel;

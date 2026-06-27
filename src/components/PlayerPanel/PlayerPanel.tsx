import { memo } from 'react';
import type { Player } from '../../game/types';
import { getOwnerBg } from '../common/playerColors';
import styles from './PlayerPanel.module.css';

type PlayerPanelProps = {
  allPlayers: Player[];
  currentPlayerIndex: number;
  onPlayerClick?: (playerId: string) => void;
};

type MemoizedPlayerChipProps = {
  player: Player;
  isActive: boolean;
  onPlayerClick?: (playerId: string) => void;
};

/**
 * プレイヤーチップを描画するメモ化コンポーネント。
 * `player` の状態と `isActive` に応じて見た目を切り替える。
 */
const MemoizedPlayerChip = memo(function MemoizedPlayerChip({
  player,
  isActive,
  onPlayerClick,
}: MemoizedPlayerChipProps) {
  const playerLabel =
    `${player.token} ${player.name} 所持金 ${player.money.toLocaleString()}ドル` +
    (player.inJail ? ' 刑務所に入っています' : '') +
    (player.isBankrupt ? ' 破産しています' : '') +
    (onPlayerClick ? ' 詳細を見る' : ' 現在は選択できません');

  return (
    <button
      type="button"
      aria-label={playerLabel}
      aria-current={isActive ? 'true' : 'false'}
      aria-disabled={!onPlayerClick}
      className={[
        styles.playerChip,
        isActive && styles.playerChipActive,
        player.isBankrupt && styles.playerChipBankrupt,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onPlayerClick ? () => onPlayerClick(player.id) : undefined}
      style={{ background: getOwnerBg(player.id) }}
      title={playerLabel}
    >
      <span aria-hidden="true">{player.token}</span>
      <span aria-hidden="true">${player.money.toLocaleString()}</span>
      {player.creditScore !== undefined && (
        <span
          className={styles.jailBadge}
          aria-hidden="true"
          title={`信用スコア: ${player.creditScore}`}
        >
          📊{player.creditScore}
        </span>
      )}
      {(player.loanBalance ?? 0) > 0 && (
        <span
          className={styles.jailBadge}
          aria-hidden="true"
          title={`ローン残高: $${player.loanBalance}`}
        >
          🏦${player.loanBalance}
        </span>
      )}
      {player.inJail && (
        <span className={styles.jailBadge} aria-hidden="true">
          🔒
        </span>
      )}
    </button>
  );
});

const PlayerPanel = memo(function PlayerPanel({
  allPlayers,
  currentPlayerIndex,
  onPlayerClick,
}: PlayerPanelProps) {
  return (
    <div className={styles.allPlayers}>
      {allPlayers.map((player, idx) => (
        <MemoizedPlayerChip
          key={player.id}
          player={player}
          isActive={idx === currentPlayerIndex}
          onPlayerClick={onPlayerClick}
        />
      ))}
    </div>
  );
});

export default PlayerPanel;

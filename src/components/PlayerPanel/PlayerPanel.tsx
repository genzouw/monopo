import { memo, useId } from 'react';
import type { Player } from '../../game/types';
import { getOwnerBg } from '../common/playerColors';
import styles from './PlayerPanel.module.css';

const LABEL_LOAN_BALANCE = 'ローン残高';
const UNIT_CURRENCY = 'ドル';
const DISABLED_REASON_TEXT =
  '他のプレイヤーの操作中や処理中は詳細を見られません';

type PlayerPanelProps = {
  allPlayers: Player[];
  currentPlayerIndex: number;
  onPlayerClick?: (playerId: string) => void;
  /** サイコロを振っている最中やコマの移動アニメーション中など、他プレイヤーの操作・処理中であるかどうか */
  disabled?: boolean;
};

type MemoizedPlayerChipProps = {
  player: Player;
  isActive: boolean;
  onPlayerClick?: (playerId: string) => void;
  /** 他プレイヤーの操作・処理中であるかどうか */
  disabled?: boolean;
};

// ⚡ Bolt: React.memo() のカスタム比較関数を追加し、PlayerChip の不要な再レンダリングを防止する。
const arePlayerChipsEqual = (
  prevProps: MemoizedPlayerChipProps,
  nextProps: MemoizedPlayerChipProps,
) => {
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.onPlayerClick === nextProps.onPlayerClick &&
    prevProps.disabled === nextProps.disabled &&
    (prevProps.player === nextProps.player ||
      (prevProps.player.id === nextProps.player.id &&
        prevProps.player.token === nextProps.player.token &&
        prevProps.player.name === nextProps.player.name &&
        prevProps.player.money === nextProps.player.money &&
        prevProps.player.inJail === nextProps.player.inJail &&
        prevProps.player.isBankrupt === nextProps.player.isBankrupt &&
        prevProps.player.creditScore === nextProps.player.creditScore &&
        prevProps.player.loanBalance === nextProps.player.loanBalance))
  );
};

/**
 * プレイヤーチップを描画するメモ化コンポーネント。
 * `player` の状態と `isActive` に応じて見た目を切り替える。
 */
const MemoizedPlayerChip = memo(function MemoizedPlayerChip({
  player,
  isActive,
  onPlayerClick,
  disabled,
}: MemoizedPlayerChipProps) {
  const playerDescriptionId = useId();
  // `onPlayerClick` が渡されていない場合に加え、他プレイヤーの操作・処理中（`disabled`）も無効理由の対象とする。
  const isDisabled = disabled || !onPlayerClick;
  return (
    <div className={styles.playerChipContainer}>
      <button
        type="button"
        aria-label={
          `${player.token} ${player.name} 所持金 ${player.money.toLocaleString()}ドル` +
          (player.inJail ? ' 刑務所に入っています' : '') +
          (player.isBankrupt ? ' 破産しています' : '') +
          (player.creditScore !== undefined
            ? ` 信用スコア ${player.creditScore}`
            : '') +
          ((player.loanBalance ?? 0) > 0
            ? ` ${LABEL_LOAN_BALANCE} ${player.loanBalance?.toLocaleString()}${UNIT_CURRENCY}`
            : '') +
          (onPlayerClick ? ' 詳細を見る' : '')
        }
        aria-current={isActive ? 'true' : 'false'}
        aria-disabled={isDisabled}
        aria-describedby={isDisabled ? playerDescriptionId : undefined}
        title={isDisabled ? DISABLED_REASON_TEXT : undefined}
        className={[
          styles.playerChip,
          isActive && styles.playerChipActive,
          player.isBankrupt && styles.playerChipBankrupt,
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={(e) => {
          if (isDisabled || !onPlayerClick) {
            e.stopPropagation();
            return;
          }
          onPlayerClick(player.id);
        }}
        style={{ background: getOwnerBg(player.id) }}
      >
        <span aria-hidden="true">{player.token}</span>
        <span aria-hidden="true">${player.money.toLocaleString()}</span>
        {player.creditScore !== undefined && (
          <span
            className={styles.jailBadge}
            aria-hidden="true"
            title={isDisabled ? undefined : `信用スコア: ${player.creditScore}`}
          >
            📊{player.creditScore}
          </span>
        )}
        {(player.loanBalance ?? 0) > 0 && (
          <span
            className={styles.jailBadge}
            aria-hidden="true"
            title={
              isDisabled ? undefined : `ローン残高: $${player.loanBalance}`
            }
          >
            🏦${player.loanBalance}
          </span>
        )}
        {player.inJail && (
          <span
            className={styles.jailBadge}
            aria-hidden="true"
            title={isDisabled ? undefined : '刑務所に入っています'}
          >
            🔒
          </span>
        )}
      </button>
      {isDisabled && (
        <span id={playerDescriptionId} className={styles.helperText}>
          {DISABLED_REASON_TEXT}
        </span>
      )}
    </div>
  );
}, arePlayerChipsEqual);

/**
 * プレイヤー一覧をチップ形式で表示するパネル。
 * `disabled` が true の間（サイコロを振っている最中やコマの移動アニメーション中など）は、
 * 各チップをクリック不可にし、無効理由のツールチップを表示する。
 */
const PlayerPanel = memo(function PlayerPanel({
  allPlayers,
  currentPlayerIndex,
  onPlayerClick,
  disabled,
}: PlayerPanelProps) {
  return (
    <div className={styles.allPlayers}>
      {allPlayers.map((player, idx) => (
        <MemoizedPlayerChip
          key={player.id}
          player={player}
          isActive={idx === currentPlayerIndex}
          onPlayerClick={onPlayerClick}
          disabled={disabled}
        />
      ))}
    </div>
  );
});

export default PlayerPanel;

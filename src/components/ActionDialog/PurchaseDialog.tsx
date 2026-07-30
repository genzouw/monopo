import { useId } from 'react';
import type { BoardSpace, Player } from '../../game/types';
import Dialog from '../common/Dialog';
import Button from '../common/Button';
import styles from './ActionDialog.module.css';

type PurchaseDialogProps = {
  space: BoardSpace;
  currentPlayer: Player;
  onBuy: () => void;
  onDecline: () => void;
};

/**
 * 物件購入確認ダイアログ。
 * マス目の物件を購入するかどうかをプレイヤーに確認し、
 * 所持金が不足している場合は購入ボタンを無効化したうえで、
 * `title` 属性によるツールチップと `aria-describedby` で結び付けた
 * 補助メッセージの両方から「おかねがたりないよ」という理由を伝える。
 */
export default function PurchaseDialog({
  space,
  currentPlayer,
  onBuy,
  onDecline,
}: PurchaseDialogProps) {
  const noMoneyHintId = useId();
  const canAfford = currentPlayer.money >= (space.price ?? 0);
  return (
    <Dialog
      title="かいますか？"
      onClose={onDecline}
      actions={
        <>
          <Button
            onClick={onBuy}
            aria-disabled={!canAfford}
            aria-describedby={!canAfford ? noMoneyHintId : undefined}
            title={!canAfford ? 'おかねがたりないよ' : undefined}
          >
            ${space.price}で買う！
          </Button>
          <Button variant="secondary" onClick={onDecline}>
            買わない（オークション）
          </Button>
        </>
      }
    >
      <div className={styles.propertyInfo}>
        <div className={styles.propertyName}>{space.name}</div>
        <div className={styles.propertyPrice}>ねだん: ${space.price}</div>
        <div className={styles.propertyPrice}>
          もってるおかね: ${currentPlayer.money.toLocaleString()}
        </div>
        {!canAfford && (
          <div id={noMoneyHintId} className={styles.noMoneyHintTight}>
            おかねがたりないよ
          </div>
        )}
      </div>
    </Dialog>
  );
}

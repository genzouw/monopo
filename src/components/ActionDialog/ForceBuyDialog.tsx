import { useId } from 'react';
import type { BoardSpace, Player } from '../../game/types';
import Dialog from '../common/Dialog';
import Button from '../common/Button';
import styles from './ActionDialog.module.css';

type ForceBuyDialogProps = {
  space: BoardSpace;
  currentPlayer: Player;
  owner: Player;
  houses: number;
  onBuy: () => void;
  onDecline: () => void;
};

/**
 * 5倍買い確認ダイアログ。
 * 他プレイヤー所有の土地を強制的に5倍価格で買い取るアクションを表示し、
 * 所持金が不足している場合は購入ボタンを無効化したうえで
 * `aria-describedby` で結び付けた補助メッセージから理由を伝える。
 */
export default function ForceBuyDialog({
  space,
  currentPlayer,
  owner,
  houses,
  onBuy,
  onDecline,
}: ForceBuyDialogProps) {
  const noMoneyHintId = useId();
  const cost = (space.price ?? 0) * 5;
  const canAfford = currentPlayer.money >= cost;
  const toOwner = Math.floor(cost * 0.6);
  const houseSellBack =
    houses > 0 && space.houseCost
      ? Math.floor(space.houseCost * houses * 0.5)
      : 0;

  return (
    <Dialog
      title="5ばいがいする？"
      onClose={onDecline}
      actions={
        <>
          <Button
            onClick={onBuy}
            aria-disabled={!canAfford}
            aria-describedby={!canAfford ? noMoneyHintId : undefined}
            title={!canAfford ? 'おかねがたりないよ' : undefined}
          >
            ${cost.toLocaleString()}で買いとる！
          </Button>
          <Button variant="secondary" onClick={onDecline}>
            やめておく
          </Button>
        </>
      }
    >
      <div className={styles.propertyInfo}>
        <div className={styles.propertyName}>{space.name}</div>
        <div className={styles.propertyPrice}>もちぬし: {owner.name}</div>
        <div className={styles.propertyPrice}>
          5ばいがいの金がく: ${cost.toLocaleString()}
        </div>
        <div
          className={styles.propertyPrice}
          style={{ fontSize: 12, opacity: 0.7 }}
        >
          （{owner.name}に${toOwner.toLocaleString()}
          {houseSellBack > 0 && ` + おうち分$${houseSellBack.toLocaleString()}`}
          、のこりは銀行へ）
        </div>
        {houses > 0 && (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            ※ おうち({houses}けん)はとりこわされるよ
          </div>
        )}
        <div className={styles.propertyPrice} style={{ marginTop: 8 }}>
          もってるおかね: ${currentPlayer.money.toLocaleString()}
        </div>
        {!canAfford && (
          <div
            id={noMoneyHintId}
            style={{ color: 'var(--color-danger)', fontSize: 13, marginTop: 4 }}
          >
            おかねがたりないよ
          </div>
        )}
      </div>
    </Dialog>
  );
}

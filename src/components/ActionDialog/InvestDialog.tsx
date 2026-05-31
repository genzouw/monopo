import { useId } from 'react';
import type { BoardSpace, Player, PropertyState } from '../../game/types';
import { INVESTMENT_COST } from '../../game/economy';
import { getSpaceById } from '../../game/rules';
import Dialog from '../common/Dialog';
import Button from '../common/Button';
import styles from './ActionDialog.module.css';

type InvestDialogProps = {
  currentPlayer: Player;
  board: BoardSpace[];
  propertyStates: Record<string, PropertyState>;
  onInvest: (propertyId: string) => void;
  onClose: () => void;
};

// 子供向けメタファー: 増資 = 「エリアのおうえん」
export default function InvestDialog({
  currentPlayer,
  board,
  propertyStates,
  onInvest,
  onClose,
}: InvestDialogProps) {
  const baseId = useId();
  const ownedProps = currentPlayer.properties
    .map((id) => ({
      space: getSpaceById(id, board),
      state: propertyStates[id],
    }))
    .filter(
      (
        x,
      ): x is {
        space: BoardSpace;
        state: PropertyState;
      } => !!x.space && !!x.space.color && !!x.state,
    );
  const canAfford = currentPlayer.money >= INVESTMENT_COST;

  return (
    <Dialog
      title="💰 エリアのおうえん（増資）"
      onClose={onClose}
      actions={
        <Button variant="secondary" onClick={onClose}>
          とじる
        </Button>
      }
    >
      <div className={styles.propertyInfo}>
        <div className={styles.propertyPrice}>
          おうえんりょう: ${INVESTMENT_COST} / 1かい
        </div>
        <div className={styles.propertyPrice}>
          もってるおかね: ${currentPlayer.money.toLocaleString()}
        </div>
        {ownedProps.length === 0 && (
          <div className={styles.noMoneyHintTight}>
            おうえんできる土地がまだないよ
          </div>
        )}
        {ownedProps.map(({ space }) => {
          const descId = `${baseId}-${space.id}`;
          return (
            <div key={space.id} className={styles.propertyInfo}>
              <div className={styles.propertyName}>{space.name}</div>
              {!canAfford && (
                <div
                  id={descId}
                  role="status"
                  className={styles.noMoneyHintTight}
                >
                  おかねがたりないよ
                </div>
              )}
              <Button
                size="small"
                onClick={() => canAfford && onInvest(space.id)}
                disabled={!canAfford}
                aria-describedby={!canAfford ? descId : undefined}
              >
                おうえん（${INVESTMENT_COST}）
              </Button>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}

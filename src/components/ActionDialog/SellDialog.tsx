import type { BoardSpace, Player, PropertyState } from '../../game/types';
import Dialog from '../common/Dialog';
import Button from '../common/Button';
import styles from './ActionDialog.module.css';

type SellDialogProps = {
  currentPlayer: Player;
  board: BoardSpace[];
  propertyStates: Record<string, PropertyState>;
  onSell: (propertyId: string) => void;
  onClose: () => void;
};

export default function SellDialog({
  currentPlayer,
  board,
  propertyStates,
  onSell,
  onClose,
}: SellDialogProps) {
  const ownedProperties = currentPlayer.properties
    .map((id) => board.find((s) => s.id === id))
    .filter((s): s is BoardSpace => !!s);

  return (
    <Dialog
      title="🏷️ 物件を売りだす"
      actions={
        <Button variant="secondary" onClick={onClose}>
          とじる
        </Button>
      }
    >
      <div className={styles.buildList}>
        {ownedProperties.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 16,
              color: 'var(--color-text-light)',
            }}
          >
            売れる物件がないよ
          </div>
        )}
        {ownedProperties.map((space) => {
          const propState = propertyStates[space.id];
          const hasHouses = (propState?.houses ?? 0) > 0;
          return (
            <div key={space.id} className={styles.buildItem}>
              <div>
                <div className={styles.buildItemName}>{space.name}</div>
                <div className={styles.buildItemInfo}>
                  {hasHouses
                    ? `家があるから先に売ってね`
                    : `購入価格: $${space.price}`}
                </div>
              </div>
              <Button
                size="small"
                variant="danger"
                onClick={() => onSell(space.id)}
                disabled={hasHouses}
              >
                売りだす
              </Button>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}

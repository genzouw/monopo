import { useId, useMemo } from 'react';
import type { BoardSpace, Player, PropertyState } from '../../game/types';
import { canMortgage, canUnmortgage, getSpaceById } from '../../game/rules';
import Dialog from '../common/Dialog';
import Button from '../common/Button';
import styles from './ActionDialog.module.css';

type MortgageDialogProps = {
  currentPlayer: Player;
  board: BoardSpace[];
  propertyStates: Record<string, PropertyState>;
  onMortgage: (propertyId: string) => void;
  onUnmortgage: (propertyId: string) => void;
  onClose: () => void;
};

export default function MortgageDialog({
  currentPlayer,
  board,
  propertyStates,
  onMortgage,
  onUnmortgage,
  onClose,
}: MortgageDialogProps) {
  const hintIdBase = useId();

  // ⚡ Bolt: 毎回のレンダリングで物件配列のマッピングとフィルタリングが行われるのを防ぐため、useMemo を使用します。
  // これにより、抵当ダイアログが開いている状態での親コンポーネントの状態変更に伴うレンダリングのオーバーヘッドを削減します。
  const ownedProperties = useMemo(() => {
    return currentPlayer.properties
      .map((id) => getSpaceById(id, board))
      .filter(
        (s): s is BoardSpace =>
          s !== undefined && s.mortgageValue !== undefined,
      );
  }, [currentPlayer.properties, board]);

  return (
    <Dialog
      title="ていとう"
      onClose={onClose}
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
            ぶっけんをもっていないよ
          </div>
        )}
        {ownedProperties.map((space) => {
          const propState = propertyStates[space.id];
          const isMortgaged = propState?.isMortgaged ?? false;
          const canDoMortgage = canMortgage(
            space.id,
            currentPlayer.id,
            propertyStates,
            board,
          );
          const canDoUnmortgage = canUnmortgage(
            space.id,
            currentPlayer.id,
            currentPlayer,
            propertyStates,
            board,
          );
          const unmortgageCost = Math.floor((space.mortgageValue ?? 0) * 1.1);
          return (
            <div key={space.id} className={styles.buildItem}>
              <div className={styles.buildItemContent}>
                <div className={styles.buildItemName}>
                  {isMortgaged ? '🔒 ' : ''}
                  {space.name}
                </div>
                <div className={styles.buildItemInfo}>
                  {isMortgaged
                    ? `かえすコスト: $${unmortgageCost}`
                    : `かりられるがく: $${space.mortgageValue}`}
                </div>
              </div>
              <div className={styles.buildItemActions}>
                {isMortgaged ? (
                  <>
                    <Button
                      size="small"
                      onClick={() => onUnmortgage(space.id)}
                      aria-disabled={!canDoUnmortgage}
                      aria-describedby={
                        !canDoUnmortgage
                          ? `${hintIdBase}-unmortgage-${space.id}`
                          : undefined
                      }
                    >
                      かえす
                    </Button>
                    {!canDoUnmortgage && (
                      <div
                        id={`${hintIdBase}-unmortgage-${space.id}`}
                        className={styles.noMoneyHintTight}
                      >
                        おかねがたりないよ
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      size="small"
                      variant="danger"
                      onClick={() => onMortgage(space.id)}
                      aria-disabled={!canDoMortgage}
                      aria-describedby={
                        !canDoMortgage
                          ? `${hintIdBase}-mortgage-${space.id}`
                          : undefined
                      }
                    >
                      かりる
                    </Button>
                    {!canDoMortgage && (
                      <div
                        id={`${hintIdBase}-mortgage-${space.id}`}
                        className={styles.noMoneyHintTight}
                      >
                        家があるグループだよ
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}

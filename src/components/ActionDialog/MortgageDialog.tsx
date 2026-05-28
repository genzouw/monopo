import { useId } from 'react';
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
  const ownedProperties = currentPlayer.properties
    .map((id: string) => getSpaceById(id, board))
    .filter((s): s is BoardSpace => !!s && !!s.mortgageValue);

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
              <div style={{ flex: 1 }}>
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
              <div
                style={{
                  marginLeft: 'auto',
                  alignSelf: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 4,
                }}
              >
                {isMortgaged ? (
                  <>
                    <Button
                      size="small"
                      onClick={() => onUnmortgage(space.id)}
                      disabled={!canDoUnmortgage}
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
                        role="status"
                        className={styles.noMoneyHintTight}
                        style={{ fontSize: 11, marginTop: 2 }}
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
                      disabled={!canDoMortgage}
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
                        role="status"
                        className={styles.noMoneyHintTight}
                        style={{ fontSize: 11, marginTop: 2 }}
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

import { useId, useMemo } from 'react';
import type {
  BoardSpace,
  ColorGroup,
  Player,
  PropertyState,
} from '../../game/types';
import { canBuildHouse, canSellHouse, getSpaceById } from '../../game/rules';
import { compareByColorOrder } from './colorSort';
import Dialog from '../common/Dialog';
import Button from '../common/Button';
import styles from './ActionDialog.module.css';

const COLOR_MAP: Record<ColorGroup, string> = {
  brown: 'var(--color-brown)',
  lightblue: 'var(--color-lightblue)',
  pink: 'var(--color-pink)',
  orange: 'var(--color-orange)',
  red: 'var(--color-red)',
  yellow: 'var(--color-yellow)',
  green: 'var(--color-green)',
  blue: 'var(--color-blue)',
  railroad: '#555',
};

const COLOR_ORDER: ColorGroup[] = [
  'brown',
  'lightblue',
  'pink',
  'orange',
  'red',
  'yellow',
  'green',
  'blue',
];

type BuildDialogProps = {
  currentPlayer: Player;
  board: BoardSpace[];
  propertyStates: Record<string, PropertyState>;
  onBuild: (propertyId: string) => void;
  onSell: (propertyId: string) => void;
  onClose: () => void;
};

const HOUSE_LABELS = ['なし', '🏠', '🏠🏠', '🏠🏠🏠', '🏠🏠🏠🏠', '🏨'];

/**
 * 家の建築・売却アクションを行うダイアログ。
 */
export default function BuildDialog({
  currentPlayer,
  board,
  propertyStates,
  onBuild,
  onSell,
  onClose,
}: BuildDialogProps) {
  const hintIdBase = useId();
  // ⚡ Bolt: useMemo to prevent mapping, filtering, and sorting the properties array on every render.
  // This avoids O(N log N) recalculation of ownedProperties on every keystroke or update within the dialog.
  const ownedProperties = useMemo(() => {
    return currentPlayer.properties
      .map((id: string) => getSpaceById(id, board))
      .filter(
        (s): s is BoardSpace => !!s && s.type === 'property' && !!s.houseCost,
      )
      .sort((a, b) => compareByColorOrder(a.color, b.color, COLOR_ORDER));
  }, [currentPlayer.properties, board]);

  return (
    <Dialog
      title="いえをたてる・うる"
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
            たてられるぶっけんがないよ
          </div>
        )}
        {ownedProperties.map((space) => {
          const propState = propertyStates[space.id];
          const houses = propState?.houses ?? 0;
          const canBuild = canBuildHouse(
            space.id,
            currentPlayer.id,
            propertyStates,
            board,
          );
          const canSell = canSellHouse(
            space.id,
            currentPlayer.id,
            propertyStates,
            board,
          );
          const canAffordBuild = currentPlayer.money >= (space.houseCost ?? 0);
          // 無効理由をここで一元管理し、title・補助テキスト表示の両方で使い回すことで不整合を防ぐ
          // （`undefined` = 有効、文字列 = その理由で無効）
          const buildDisabledReason = !canBuild
            ? 'たてられないよ'
            : !canAffordBuild
              ? 'おかねがたりないよ'
              : undefined;
          const sellDisabledReason = !canSell ? 'うれないよ' : undefined;
          return (
            <div key={space.id} className={styles.buildItem}>
              {space.color && (
                <div
                  style={{
                    width: 6,
                    borderRadius: 3,
                    background: COLOR_MAP[space.color],
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div className={styles.buildItemName}>{space.name}</div>
                <div className={styles.buildItemInfo}>
                  {HOUSE_LABELS[houses]} たてるコスト: ${space.houseCost}
                </div>
              </div>
              <div className={styles.buildItemActionPair}>
                <div className={styles.buildItemActionColumn}>
                  <Button
                    size="small"
                    onClick={() => onBuild(space.id)}
                    aria-disabled={buildDisabledReason !== undefined}
                    aria-describedby={
                      buildDisabledReason !== undefined
                        ? `${hintIdBase}-build-${space.id}`
                        : undefined
                    }
                    title={buildDisabledReason}
                  >
                    たてる
                  </Button>
                  {buildDisabledReason !== undefined && (
                    <div
                      id={`${hintIdBase}-build-${space.id}`}
                      className={styles.noMoneyHintTight}
                      role="status"
                    >
                      {buildDisabledReason}
                    </div>
                  )}
                </div>
                <div className={styles.buildItemActionColumn}>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => onSell(space.id)}
                    aria-disabled={sellDisabledReason !== undefined}
                    aria-describedby={
                      sellDisabledReason !== undefined
                        ? `${hintIdBase}-sell-${space.id}`
                        : undefined
                    }
                    title={sellDisabledReason}
                  >
                    うる
                  </Button>
                  {sellDisabledReason !== undefined && (
                    <div
                      id={`${hintIdBase}-sell-${space.id}`}
                      className={styles.noMoneyHintTight}
                      role="status"
                    >
                      {sellDisabledReason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}

import { memo } from 'react';
import type {
  BoardSpace,
  ColorGroup,
  Player,
  PropertyState,
} from '../../game/types';
import { getOwnerBg } from '../common/playerColors';
import styles from './Board.module.css';

// Re-use logic from MiniMap.tsx
const COLOR_MAP: Record<ColorGroup, string> = {
  brown: 'var(--color-brown)',
  lightblue: 'var(--color-lightblue)',
  pink: 'var(--color-pink)',
  orange: 'var(--color-orange)',
  red: 'var(--color-red)',
  yellow: 'var(--color-yellow)',
  green: 'var(--color-green)',
  blue: 'var(--color-blue)',
  railroad: 'var(--color-railroad)',
};

function getSpaceIcon(space: BoardSpace): string | null {
  if (space.type === 'railroad') return '🚂';
  if (space.type === 'utility') {
    return space.id === 'electric' ? '💡' : '💧';
  }
  if (space.type === 'chance') return '❓';
  if (space.type === 'communityChest') return '💝';
  if (space.type === 'tax') return '💸';
  if (space.id === 'go') return '▶️';
  if (space.id === 'jail') return '🔒';
  if (space.id === 'free-parking') return '🅿️';
  if (space.id === 'go-to-jail') return '👮';
  return null;
}

function getSpaceLabel(
  space: BoardSpace,
  ownerName: string | undefined,
  houses: number,
  playerCount: number,
): string {
  let label = space.name;
  if (ownerName) label += ` 所有者: ${ownerName}`;
  if (houses > 0) label += houses === 5 ? ' ホテル' : ` 家${houses}軒`;
  if (playerCount > 0) label += ` プレイヤー${playerCount}人滞在中`;
  return label;
}

function getColorBarPosition(position: number): React.CSSProperties {
  if (position <= 10) return { top: 0, left: 0, right: 0 };
  if (position <= 20) return { top: 0, bottom: 0, right: 0 };
  if (position <= 30) return { bottom: 0, left: 0, right: 0 };
  return { top: 0, bottom: 0, left: 0 };
}

function isHorizontalEdge(position: number): boolean {
  return position <= 10 || (position > 20 && position <= 30);
}

type MemoizedMiniSpaceProps = {
  space: BoardSpace;
  row: number;
  col: number;
  playersHere: readonly Player[];
  propState?: PropertyState;
  owner?: Player;
  onSpaceClick: (position: number) => void;
};

const areEqual = (
  prevProps: MemoizedMiniSpaceProps,
  nextProps: MemoizedMiniSpaceProps,
) => {
  if (prevProps.playersHere.length !== nextProps.playersHere.length)
    return false;
  for (let i = 0; i < prevProps.playersHere.length; i++) {
    if (
      prevProps.playersHere[i].id !== nextProps.playersHere[i].id ||
      prevProps.playersHere[i].token !== nextProps.playersHere[i].token
    )
      return false;
  }

  const prevPropState = prevProps.propState;
  const nextPropState = nextProps.propState;
  if (prevPropState !== nextPropState) {
    if (!prevPropState || !nextPropState) return false;
    if (
      prevPropState.ownerId !== nextPropState.ownerId ||
      prevPropState.houses !== nextPropState.houses
    ) {
      return false;
    }
  }

  if (
    prevProps.owner?.name !== nextProps.owner?.name ||
    prevProps.owner?.token !== nextProps.owner?.token
  ) {
    return false;
  }

  return true;
};

export const MemoizedMiniSpace = memo(function MemoizedMiniSpace({
  space,
  row,
  col,
  playersHere,
  propState,
  owner,
  onSpaceClick,
}: MemoizedMiniSpaceProps) {
  const icon = getSpaceIcon(space);
  const ownerId = propState?.ownerId;
  const ownerBg = ownerId ? getOwnerBg(ownerId) : undefined;
  const ownerName = owner?.name;
  const houses = propState?.houses ?? 0;
  const ariaLabel = getSpaceLabel(space, ownerName, houses, playersHere.length);

  return (
    <button
      type="button"
      className={styles.miniSpace}
      style={{
        gridRow: row,
        gridColumn: col,
        background:
          ownerBg ??
          (space.position === 0
            ? 'var(--color-go-square)'
            : space.type === 'chance'
              ? 'var(--color-chance-square)'
              : 'var(--color-white)'),
      }}
      onClick={() => onSpaceClick(space.position)}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {space.color && (
        <div
          className={`${styles.miniSpaceColor} ${isHorizontalEdge(space.position) ? styles.miniSpaceColorH : styles.miniSpaceColorV}`}
          style={{
            background: COLOR_MAP[space.color],
            ...getColorBarPosition(space.position),
          }}
        />
      )}
      {icon && (
        <span className={styles.miniSpaceIcon} aria-hidden="true">
          {icon}
        </span>
      )}
      {owner?.token && (
        <span className={styles.miniOwnerToken}>{owner.token}</span>
      )}
      {propState && propState.houses > 0 && (
        <span className={styles.miniHouses}>
          {propState.houses === 5 ? '🏨' : '🏠'.repeat(propState.houses)}
        </span>
      )}
      {playersHere.map((p, i) => (
        <span
          key={p.id}
          className={styles.miniToken}
          style={{ top: `${i * 10}px`, left: `${i * 6}px` }}
        >
          {p.token}
        </span>
      ))}
    </button>
  );
}, areEqual);

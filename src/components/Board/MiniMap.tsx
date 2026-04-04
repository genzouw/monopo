import type {
  BoardSpace,
  Player,
  PropertyState,
  ColorGroup,
} from '../../game/types';
import styles from './Board.module.css';

const COLOR_MAP: Record<ColorGroup, string> = {
  brown: 'var(--color-brown)',
  lightblue: 'var(--color-lightblue)',
  pink: 'var(--color-pink)',
  orange: 'var(--color-orange)',
  red: 'var(--color-red)',
  yellow: 'var(--color-yellow)',
  green: 'var(--color-green)',
  blue: 'var(--color-blue)',
};

type MiniMapProps = {
  board: BoardSpace[];
  propertyStates: Record<string, PropertyState>;
  players: Player[];
  onSpaceClick: (position: number) => void;
};

function getGridPosition(position: number): { row: number; col: number } {
  if (position <= 10) return { row: 11, col: 11 - position };
  if (position <= 20) return { row: 11 - (position - 10), col: 1 };
  if (position <= 30) return { row: 1, col: position - 20 + 1 };
  return { row: position - 30 + 1, col: 11 };
}

export default function MiniMap({
  board,
  propertyStates,
  players,
  onSpaceClick,
}: MiniMapProps) {
  const activePlayers = players.filter((p) => !p.isBankrupt);
  return (
    <div className={styles.miniMap}>
      <div className={styles.miniMapBoard}>
        {board.map((space) => {
          const { row, col } = getGridPosition(space.position);
          const playersHere = activePlayers.filter(
            (p) => p.position === space.position,
          );
          const propState = propertyStates[space.id];
          return (
            <div
              key={space.id}
              className={`${styles.miniSpace} ${propState?.ownerId ? styles.miniOwned : ''}`}
              style={{ gridRow: row, gridColumn: col }}
              onClick={() => onSpaceClick(space.position)}
            >
              {space.color && (
                <div
                  className={styles.miniSpaceColor}
                  style={{ background: COLOR_MAP[space.color] }}
                />
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
            </div>
          );
        })}
        <div className={styles.miniCenter}>🎲</div>
      </div>
    </div>
  );
}

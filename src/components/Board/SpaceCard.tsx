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
  railroad: '#555',
};

type SpaceCardProps = {
  space: BoardSpace;
  propertyState?: PropertyState;
  players: Player[];
  isCurrent: boolean;
  owner?: Player;
};

export default function SpaceCard({
  space,
  propertyState,
  players,
  isCurrent,
  owner,
}: SpaceCardProps) {
  const playersHere = players.filter(
    (p) => p.position === space.position && !p.isBankrupt,
  );
  const houses = propertyState?.houses ?? 0;
  const houseDisplay =
    houses === 5 ? '🏨' : houses > 0 ? '🏠'.repeat(houses) : '';
  return (
    <div
      className={`${styles.spaceCard} ${isCurrent ? styles.spaceCardCurrent : ''}`}
    >
      {space.color && (
        <div
          className={styles.spaceColor}
          style={{ background: COLOR_MAP[space.color] }}
        />
      )}
      {playersHere.length > 0 && (
        <div className={styles.playerTokensOnSpace}>
          {playersHere.map((p) => (
            <span key={p.id}>{p.token}</span>
          ))}
        </div>
      )}
      <div className={styles.spaceName}>{space.name}</div>
      {space.price !== undefined && space.type !== 'tax' && (
        <div className={styles.spacePrice}>${space.price}</div>
      )}
      {owner && (
        <div className={styles.spaceOwner}>
          {owner.token} {owner.name}
        </div>
      )}
      {houseDisplay && <div className={styles.spaceHouses}>{houseDisplay}</div>}
      {propertyState?.isMortgaged && (
        <div className={styles.spacePrice}>💤 あずけ中</div>
      )}
    </div>
  );
}

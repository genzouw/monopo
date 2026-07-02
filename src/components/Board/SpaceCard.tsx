import { memo } from 'react';
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
  playersHere: readonly Player[];
  isCurrent: boolean;
  owner?: Player;
};


// ⚡ Bolt: React.memo() のカスタム比較関数を追加し、SpaceCard の不要な再レンダリングを防止する。
const areSpaceCardsEqual = (
  prevProps: SpaceCardProps,
  nextProps: SpaceCardProps,
) => {
  if (prevProps.isCurrent !== nextProps.isCurrent) return false;
  if (prevProps.space.id !== nextProps.space.id) return false;

  if (prevProps.playersHere.length !== nextProps.playersHere.length) return false;
  for (let i = 0; i < prevProps.playersHere.length; i++) {
    if (
      prevProps.playersHere[i].id !== nextProps.playersHere[i].id ||
      prevProps.playersHere[i].token !== nextProps.playersHere[i].token
    ) return false;
  }

  const prevPropState = prevProps.propertyState;
  const nextPropState = nextProps.propertyState;
  if (prevPropState !== nextPropState) {
    if (!prevPropState || !nextPropState) return false;
    if (
      prevPropState.houses !== nextPropState.houses ||
      prevPropState.isMortgaged !== nextPropState.isMortgaged ||
      prevPropState.ownerId !== nextPropState.ownerId
    ) return false;
  }

  if (
    prevProps.owner?.name !== nextProps.owner?.name ||
    prevProps.owner?.token !== nextProps.owner?.token
  ) return false;

  return true;
};

const SpaceCard = memo(function SpaceCard({
  space,
  propertyState,
  playersHere,
  isCurrent,
  owner,
}: SpaceCardProps) {
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
}, areSpaceCardsEqual);

export default SpaceCard;

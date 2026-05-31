import { useRef, useEffect, memo, useMemo } from 'react';
import type { BoardSpace, Player, PropertyState } from '../../game/types';
import SpaceCard from './SpaceCard';
import styles from './Board.module.css';

const EMPTY_PLAYERS: readonly Player[] = [];

type FocusViewProps = {
  board: BoardSpace[];
  propertyStates: Record<string, PropertyState>;
  players: Player[];
  currentPosition: number;
};

const FocusView = memo(function FocusView({
  board,
  propertyStates,
  players,
  currentPosition,
}: FocusViewProps) {
  const playersById = useMemo(() => {
    const dict: Record<string, Player> = {};
    for (const p of players) {
      dict[p.id] = p;
    }
    return dict;
  }, [players]);

  // ⚡ Bolt: precompute players by position to prevent O(N) filtering inside each SpaceCard
  const playersByPosition = useMemo(() => {
    const grouped: Record<number, Player[]> = {};
    for (const p of players) {
      if (!p.isBankrupt) {
        if (!grouped[p.position]) {
          grouped[p.position] = [];
        }
        grouped[p.position].push(p);
      }
    }
    return grouped;
  }, [players]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const visibleRange = 2;
  const indices: number[] = [];
  for (let i = -visibleRange; i <= visibleRange; i++)
    indices.push((currentPosition + i + 40) % 40);

  useEffect(() => {
    if (scrollRef.current) {
      const centerCard = scrollRef.current.children[
        visibleRange
      ] as HTMLElement;
      if (centerCard)
        centerCard.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
    }
  }, [currentPosition]);

  return (
    <div className={styles.focusView} ref={scrollRef}>
      {indices.map((pos) => {
        const space = board[pos];
        const propState = propertyStates[space.id];
        const owner = propState?.ownerId
          ? playersById[propState.ownerId]
          : undefined;
        // Use a stable reference EMPTY_PLAYERS to prevent React.memo bailouts when empty
        const playersHere = playersByPosition[pos] || EMPTY_PLAYERS;
        return (
          <SpaceCard
            key={`${space.id}-${pos}`}
            space={space}
            propertyState={propState}
            playersHere={playersHere}
            isCurrent={pos === currentPosition}
            owner={owner}
          />
        );
      })}
    </div>
  );
});

export default FocusView;

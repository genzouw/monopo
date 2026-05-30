import { useRef, useEffect, memo, useMemo } from 'react';
import type { BoardSpace, Player, PropertyState } from '../../game/types';
import SpaceCard from './SpaceCard';
import styles from './Board.module.css';

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
        return (
          <SpaceCard
            key={`${space.id}-${pos}`}
            space={space}
            propertyState={propState}
            players={players}
            isCurrent={pos === currentPosition}
            owner={owner}
          />
        );
      })}
    </div>
  );
});

export default FocusView;

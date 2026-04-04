import { useRef, useEffect } from 'react';
import type { BoardSpace, Player, PropertyState } from '../../game/types';
import SpaceCard from './SpaceCard';
import styles from './Board.module.css';

type FocusViewProps = {
  board: BoardSpace[];
  propertyStates: Record<string, PropertyState>;
  players: Player[];
  currentPosition: number;
};

export default function FocusView({
  board,
  propertyStates,
  players,
  currentPosition,
}: FocusViewProps) {
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
          ? players.find((p) => p.id === propState.ownerId)
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
}

import { memo, useMemo } from 'react';
import type { BoardSpace, Player, PropertyState } from '../../game/types';
import styles from './Board.module.css';

import { MemoizedMiniSpace } from './MemoizedMiniSpace';

type MiniMapProps = {
  board: BoardSpace[];
  propertyStates: Record<string, PropertyState>;
  players: Player[];
  onSpaceClick: (position: number) => void;
  children?: React.ReactNode;
};

function getGridPosition(position: number): { row: number; col: number } {
  if (position <= 10) return { row: 11, col: 11 - position };
  if (position <= 20) return { row: 11 - (position - 10), col: 1 };
  if (position <= 30) return { row: 1, col: position - 20 + 1 };
  return { row: position - 30 + 1, col: 11 };
}

const MiniMap = memo(function MiniMap({
  board,
  propertyStates,
  players,
  onSpaceClick,
  children,
}: MiniMapProps) {
  // ⚡ Bolt: group players by position once (O(N)) to avoid O(N*M) nested filtering over 40 spaces.
  const playersByPosition = useMemo(() => {
    const grouped: Record<number, Player[]> = {};
    for (const space of board) {
      grouped[space.position] = [];
    }
    for (const p of players) {
      if (!p.isBankrupt && grouped[p.position]) {
        grouped[p.position].push(p);
      }
    }
    return grouped;
  }, [players, board]);

  // ⚡ Bolt: 各マスでの O(N) 探索を避けるため、プレイヤーID辞書を一度だけ構築する。
  const playersById = useMemo(() => {
    const dict: Record<string, Player> = {};
    for (const p of players) {
      dict[p.id] = p;
    }
    return dict;
  }, [players]);

  return (
    <div className={styles.miniMap}>
      <div className={styles.miniMapBoard}>
        {board.map((space) => {
          const { row, col } = getGridPosition(space.position);
          const playersHere = playersByPosition[space.position];
          const propState = propertyStates[space.id];
          const owner = propState?.ownerId
            ? playersById[propState.ownerId]
            : undefined;

          return (
            <MemoizedMiniSpace
              key={space.id}
              space={space}
              row={row}
              col={col}
              playersHere={playersHere}
              propState={propState}
              owner={owner}
              onSpaceClick={onSpaceClick}
            />
          );
        })}
        <div className={styles.miniCenter}>{children ?? '🎲'}</div>
      </div>
    </div>
  );
});

export default MiniMap;

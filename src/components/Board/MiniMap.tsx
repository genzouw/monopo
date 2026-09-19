import { memo, useMemo } from 'react';
import type { BoardSpace, Player, PropertyState } from '../../game/types';
import styles from './Board.module.css';

import { MemoizedMiniSpace } from './MemoizedMiniSpace';

type MiniMapProps = {
  board: BoardSpace[];
  propertyStates: Record<string, PropertyState>;
  players: Player[];
  playersById?: Record<string, Player>;
  onSpaceClick: (position: number) => void;
  children?: React.ReactNode;
  /** 盤面中央の空きスペース上部に重ねて表示する要素（景気インジケーターなど） */
  overlay?: React.ReactNode;
};

// ⚡ Bolt: getGridPosition の呼び出しごとに { row, col } を新規生成しないよう、モジュール読み込み時に一度だけ計算しておく。
const GRID_POSITIONS = Array.from({ length: 40 }, (_, i) => {
  if (i <= 10) return { row: 11, col: 11 - i };
  if (i <= 20) return { row: 11 - (i - 10), col: 1 };
  if (i <= 30) return { row: 1, col: i - 20 + 1 };
  return { row: i - 30 + 1, col: 11 };
});

/**
 * 盤面上の位置インデックスから、ミニマップ表示用の行・列を返す。
 * @param position - 盤面上の位置（0〜39）
 * @returns ミニマップのグリッド座標
 */
function getGridPosition(position: number): { row: number; col: number } {
  return GRID_POSITIONS[position] ?? { row: 11, col: 11 };
}

// Single shared reference for empty spaces — keeps MemoizedMiniSpace props referentially equal, allowing React.memo to skip re-renders.
const EMPTY_PLAYERS: readonly Player[] = [];

/**
 * 盤面全体を縮小表示するミニマップ。
 * `playersById` が渡された場合は、そのまま外部辞書を参照して各マスの所有者プレイヤーを解決する（内部で辞書を再構築しない）。
 */
const MiniMap = memo(function MiniMap({
  board,
  propertyStates,
  players,
  playersById: externalPlayersById,
  onSpaceClick,
  children,
  overlay,
}: MiniMapProps) {
  // ⚡ Bolt: group players by position once (O(N)) to avoid O(N*M) nested filtering over 40 spaces.
  const playersByPosition = useMemo(() => {
    const grouped: Partial<Record<number, Player[]>> = {};
    for (const p of players) {
      if (!p.isBankrupt) {
        (grouped[p.position] ??= []).push(p);
      }
    }
    return grouped;
  }, [players]);

  // ⚡ Bolt: プレイヤーID辞書の再構築によるアニメーション中の毎フレームのオブジェクト生成を防ぐため、外部から渡された安定した辞書を使用する。
  const playersById = useMemo(() => {
    if (externalPlayersById) return externalPlayersById;
    const dict: Record<string, Player> = {};
    for (const p of players) {
      dict[p.id] = p;
    }
    return dict;
  }, [players, externalPlayersById]);

  return (
    <div className={styles.miniMap}>
      <div className={styles.miniMapBoard}>
        {board.map((space) => {
          const { row, col } = getGridPosition(space.position);
          const playersHere =
            playersByPosition[space.position] ?? EMPTY_PLAYERS;
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
        <div className={styles.miniCenter}>
          {overlay && <div className={styles.miniCenterOverlay}>{overlay}</div>}
          {children ?? '🎲'}
        </div>
      </div>
    </div>
  );
});

export default MiniMap;

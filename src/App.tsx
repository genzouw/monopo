import { useReducer, useEffect, useState } from 'react';
import { gameReducer, createInitialGameState } from './game/reducer';
import { saveGame, loadGame, clearSave } from './game/storage';
import type { GameState } from './game/types';
import Setup from './components/Setup/Setup';
import GameBoard from './components/GameBoard/GameBoard';
import Button from './components/common/Button';
import styles from './App.module.css';

export default function App() {
  const [savedGame] = useState<GameState | null>(() => loadGame());

  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    createInitialGameState,
  );

  useEffect(() => {
    if (state.phase === 'playing') {
      saveGame(state);
    } else if (state.phase === 'finished') {
      clearSave();
    }
  }, [state]);

  if (state.phase === 'setup') {
    return (
      <div className={styles.app}>
        <Setup
          onStart={(names, tokens, features) =>
            dispatch({
              type: 'START_GAME',
              playerNames: names,
              playerTokens: tokens,
              features,
            })
          }
          onResume={
            savedGame
              ? () =>
                  dispatch({
                    type: 'RESUME_GAME',
                    savedState: savedGame,
                  })
              : undefined
          }
          savedGame={savedGame}
        />
      </div>
    );
  }

  if (state.phase === 'finished') {
    const winner = state.players.find((p) => p.id === state.winnerId)!;
    return (
      <div className={styles.app}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 24,
            padding: 24,
          }}
        >
          <div style={{ fontSize: 64 }}>🎉</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {winner.token} {winner.name}のかち！
          </div>
          <div style={{ fontSize: 18, color: 'var(--color-text-light)' }}>
            おめでとう！
          </div>
          <Button size="large" onClick={() => window.location.reload()}>
            もういちどあそぶ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <GameBoard state={state} dispatch={dispatch} />
    </div>
  );
}

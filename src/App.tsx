import { useReducer } from 'react';
import { gameReducer, createInitialGameState } from './game/reducer';
import Setup from './components/Setup/Setup';
import GameBoard from './components/GameBoard/GameBoard';
import styles from './App.module.css';

export default function App() {
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    createInitialGameState,
  );

  if (state.phase === 'setup') {
    return (
      <div className={styles.app}>
        <Setup
          onStart={(names, tokens) =>
            dispatch({
              type: 'START_GAME',
              playerNames: names,
              playerTokens: tokens,
            })
          }
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
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '16px 32px',
              fontSize: 18,
              fontWeight: 700,
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 16,
              cursor: 'pointer',
            }}
          >
            もういちどあそぶ
          </button>
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

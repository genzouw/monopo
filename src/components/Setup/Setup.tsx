import { useState } from 'react';
import { TOKENS } from '../../game/types';
import Button from '../common/Button';
import styles from './Setup.module.css';

type SetupProps = { onStart: (names: string[], tokens: string[]) => void };
const DEFAULT_NAMES = [
  'プレイヤー1',
  'プレイヤー2',
  'プレイヤー3',
  'プレイヤー4',
];

export default function Setup({ onStart }: SetupProps) {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState(DEFAULT_NAMES);
  const [selectedTokens, setSelectedTokens] = useState([
    TOKENS[0],
    TOKENS[1],
    TOKENS[2],
    TOKENS[3],
  ]);

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...names];
    newNames[index] = name;
    setNames(newNames);
  };

  const handleTokenChange = (playerIndex: number, token: string) => {
    const newTokens = [...selectedTokens];
    const existingIndex = newTokens.findIndex(
      (t, i) => t === token && i !== playerIndex,
    );
    if (existingIndex !== -1) newTokens[existingIndex] = newTokens[playerIndex];
    newTokens[playerIndex] = token;
    setSelectedTokens(newTokens);
  };

  const canStart = names
    .slice(0, playerCount)
    .every((n) => n.trim().length > 0);

  return (
    <div className={styles.setup}>
      <div className={styles.title}>🎲 モノポリ</div>
      <div className={styles.subtitle}>いっしょにあそぼう！</div>
      <div className={styles.playerCount}>
        <button
          className={styles.countButton}
          onClick={() => setPlayerCount((c) => c - 1)}
          disabled={playerCount <= 2}
        >
          −
        </button>
        <span>{playerCount}人であそぶ</span>
        <button
          className={styles.countButton}
          onClick={() => setPlayerCount((c) => c + 1)}
          disabled={playerCount >= 4}
        >
          ＋
        </button>
      </div>
      <div className={styles.playerList}>
        {Array.from({ length: playerCount }).map((_, i) => (
          <div key={i} className={styles.playerRow}>
            <button
              style={{
                fontSize: 28,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => {
                const currentIdx = TOKENS.indexOf(
                  selectedTokens[i] as (typeof TOKENS)[number],
                );
                const nextToken = TOKENS[(currentIdx + 1) % TOKENS.length];
                handleTokenChange(i, nextToken);
              }}
            >
              {selectedTokens[i]}
            </button>
            <input
              className={styles.nameInput}
              value={names[i]}
              onChange={(e) => handleNameChange(i, e.target.value)}
              placeholder={`プレイヤー${i + 1}のなまえ`}
            />
          </div>
        ))}
      </div>
      <div className={styles.subtitle}>
        アイコンをタップしてコマをえらべるよ
      </div>
      <Button
        size="large"
        className={styles.startButton}
        onClick={() =>
          onStart(
            names.slice(0, playerCount),
            selectedTokens.slice(0, playerCount),
          )
        }
        disabled={!canStart}
      >
        ゲームスタート！
      </Button>
    </div>
  );
}

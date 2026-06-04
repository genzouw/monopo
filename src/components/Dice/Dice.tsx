import { useState, useEffect, useRef } from 'react';
import styles from './Dice.module.css';
import { getSecureRandomInt } from '../../game/random';

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

type DiceProps = {
  values: [number, number];
  rolling: boolean;
  onRollComplete?: () => void;
};

export default function Dice({ values, rolling, onRollComplete }: DiceProps) {
  const [randomValues, setRandomValues] = useState<[number, number] | null>(
    null,
  );
  const callbackRef = useRef(onRollComplete);

  useEffect(() => {
    callbackRef.current = onRollComplete;
  }, [onRollComplete]);

  useEffect(() => {
    if (!rolling) return;
    let count = 0;
    const interval = setInterval(() => {
      count++;
      if (count >= 8) {
        clearInterval(interval);
        setRandomValues(null);
        callbackRef.current?.();
      } else {
        setRandomValues([getSecureRandomInt(1, 6), getSecureRandomInt(1, 6)]);
      }
    }, 100);
    return () => {
      clearInterval(interval);
      setRandomValues(null);
    };
  }, [rolling]);

  const isAnimating = rolling || randomValues !== null;
  const displayValues = randomValues ?? values;
  const isDoubles = values[0] === values[1];
  return (
    <div>
      <div className={styles.diceContainer} aria-hidden="true">
        <div
          className={`${styles.die} ${isAnimating ? styles.rolling : ''} ${isDoubles && !isAnimating ? styles.doubles : ''}`}
        >
          {DICE_FACES[displayValues[0]]}
        </div>
        <div
          className={`${styles.die} ${isAnimating ? styles.rolling : ''} ${isDoubles && !isAnimating ? styles.doubles : ''}`}
        >
          {DICE_FACES[displayValues[1]]}
        </div>
      </div>
      {!isAnimating && isDoubles && (
        <div className={styles.diceResult} aria-hidden="true">
          ゾロ目！
        </div>
      )}
      {/* スクリーンリーダー用のアナウンス */}
      <div
        role="status"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {!isAnimating
          ? `さいころの目は ${values[0]} と ${values[1]} です。${isDoubles ? 'ゾロ目！' : ''}`
          : ''}
      </div>
    </div>
  );
}

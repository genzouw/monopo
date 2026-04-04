import { useState, useEffect } from 'react';
import styles from './Dice.module.css';

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

type DiceProps = {
  values: [number, number];
  rolling: boolean;
  onRollComplete?: () => void;
};

export default function Dice({ values, rolling, onRollComplete }: DiceProps) {
  const [displayValues, setDisplayValues] = useState(values);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (rolling) {
      setIsAnimating(true);
      let count = 0;
      const interval = setInterval(() => {
        setDisplayValues([
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
        ]);
        count++;
        if (count >= 8) {
          clearInterval(interval);
          setDisplayValues(values);
          setIsAnimating(false);
          onRollComplete?.();
        }
      }, 100);
      return () => clearInterval(interval);
    } else {
      setDisplayValues(values);
    }
  }, [rolling, values, onRollComplete]);

  const isDoubles = values[0] === values[1];
  return (
    <div>
      <div className={styles.diceContainer}>
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
        <div className={styles.diceResult}>ゾロ目！</div>
      )}
    </div>
  );
}

import type { EconomyStatus } from '../../game/types';
import { ECONOMY_DISPLAY } from '../common/economyDisplay';
import styles from './EconomyIndicator.module.css';

type EconomyIndicatorProps = {
  /** 現在の景気ステータス */
  status: EconomyStatus;
};

/**
 * 現在の景気（好況・通常・不況・金融危機）をアイコン付きバッジで常時表示するコンポーネント。
 *
 * 景気は家賃・株価・ローン金利に影響するため、いつでも確認できるよう盤面中央の空きスペースに重ねて配置する
 * （縦方向の表示領域を消費しないため、盤面やボタンが狭くならない）。
 * `features.macroEconomy` が有効なときのみ描画される想定（呼び出し側で判定する）。
 *
 * @param status 現在の景気ステータス。
 * @returns 景気バッジ要素。
 */
export default function EconomyIndicator({ status }: EconomyIndicatorProps) {
  const { icon, label, description } = ECONOMY_DISPLAY[status];

  return (
    <span
      className={`${styles.badge} ${styles[status]}`}
      title={description}
      aria-label={`いまのけいき: ${label}。${description}`}
    >
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.label}>けいき: {label}</span>
    </span>
  );
}

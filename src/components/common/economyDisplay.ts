import type { EconomyStatus } from '../../game/types';

/** 景気ステータスを UI に表示するための情報（アイコン・ラベル・子供向け説明）。 */
export type EconomyDisplay = {
  /** 一目で景気がわかる絵文字アイコン（天気メタファー） */
  icon: string;
  /** 日本語ラベル */
  label: string;
  /** 子供にもわかる短い説明（ツールチップ・読み上げに使用） */
  description: string;
};

/**
 * 景気ステータスごとの表示情報。
 * 天気の絵文字（晴れ＝好況 → 雷雨＝金融危機）で直感的に良し悪しが伝わるようにしている。
 */
export const ECONOMY_DISPLAY: Record<EconomyStatus, EconomyDisplay> = {
  boom: {
    icon: '☀️',
    label: '好況',
    description: 'けいきがいいよ！ おかねやかぶのねうちが上がっているよ',
  },
  normal: {
    icon: '⛅',
    label: '通常',
    description: 'ふつうのけいきだよ',
  },
  recession: {
    icon: '🌧️',
    label: '不況',
    description: 'けいきがわるいよ。ねうちが下がっているよ',
  },
  crisis: {
    icon: '⛈️',
    label: '金融危機',
    description: 'たいへん！ ねうちが大きく下がっているよ',
  },
};

/**
 * 景気ステータスの日本語ラベルを返す。
 *
 * @param status 景気ステータス。未定義（macroEconomy 無効時）の場合は `'—'` を返す。
 * @returns 日本語ラベル。
 */
export function getEconomyLabel(status: EconomyStatus | undefined): string {
  return status ? ECONOMY_DISPLAY[status].label : '—';
}

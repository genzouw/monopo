import { useId } from 'react';
import type {
  ColorGroup,
  ColorGroupStock,
  EconomyStatus,
  Player,
} from '../../game/types';
import { getEffectiveStockPrice } from '../../game/economy';
import Dialog from '../common/Dialog';
import Button from '../common/Button';
import styles from './ActionDialog.module.css';

type StockDialogProps = {
  currentPlayer: Player;
  stockMarket: Partial<Record<ColorGroup, ColorGroupStock>>;
  /** 景気を加味した実効株価を表示するための現在の景気ステータス（macroEconomy 無効時は未指定）。 */
  economyStatus?: EconomyStatus;
  onBuy: (color: ColorGroup, shares: number) => void;
  onSell: (color: ColorGroup, shares: number) => void;
  onClose: () => void;
};

// 子供向けメタファー: 株 = 「おうえんカード」
const COLOR_LABEL: Record<ColorGroup, string> = {
  brown: '🟤 ちゃいろ',
  lightblue: '🩵 みずいろ',
  pink: '🩷 ピンク',
  orange: '🟠 オレンジ',
  red: '🔴 あか',
  yellow: '🟡 きいろ',
  green: '🟢 みどり',
  blue: '🔵 あお',
  railroad: '🚂 てつどう',
};

const SHARES_PER_TRADE = 1;

/**
 * 株（おうえんカード）の購入・売却を行うダイアログ。
 */
export default function StockDialog({
  currentPlayer,
  stockMarket,
  economyStatus,
  onBuy,
  onSell,
  onClose,
}: StockDialogProps) {
  const baseId = useId();
  const groups = Object.keys(stockMarket) as ColorGroup[];

  return (
    <Dialog
      title="📈 おうえんカード（株）の売買"
      onClose={onClose}
      actions={
        <Button variant="secondary" onClick={onClose}>
          とじる
        </Button>
      }
    >
      <div className={styles.propertyInfo}>
        <div className={styles.propertyPrice}>
          もってるおかね: ${currentPlayer.money.toLocaleString()}
        </div>
        {groups.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 16,
              color: 'var(--color-text-light)',
            }}
          >
            うっているかぶがないよ
          </div>
        )}
        {groups.map((color) => {
          const market = stockMarket[color];
          if (!market) return null;
          const owned = currentPlayer.stocks?.[color] ?? 0;
          const price = getEffectiveStockPrice(
            market.pricePerShare,
            economyStatus,
          );
          const isMoneyShort = currentPlayer.money < price;
          const isBankShort = market.bankShares < SHARES_PER_TRADE;
          const canBuy = !isMoneyShort && !isBankShort;
          const canSell = owned >= SHARES_PER_TRADE;
          const buyDisabledReason = isMoneyShort
            ? 'おかねがたりないよ'
            : isBankShort
              ? 'うりきれだよ'
              : '';
          const buyDescId = `${baseId}-${color}-buy`;
          const sellDescId = `${baseId}-${color}-sell`;
          return (
            <div key={color} className={styles.propertyInfo}>
              <div className={styles.propertyName}>{COLOR_LABEL[color]}</div>
              <div className={styles.propertyPrice}>
                かかく: ${price} / じぶん: {owned}まい / ぎんこう:{' '}
                {market.bankShares}まい
              </div>
              {!canBuy && buyDisabledReason && (
                <div
                  id={buyDescId}
                  role="status"
                  className={styles.noMoneyHintTight}
                >
                  {buyDisabledReason}
                </div>
              )}
              {!canSell && (
                <div
                  id={sellDescId}
                  role="status"
                  className={styles.noMoneyHintTight}
                >
                  もっていないよ
                </div>
              )}
              <Button
                size="small"
                onClick={() => onBuy(color, SHARES_PER_TRADE)}
                aria-disabled={!canBuy}
                aria-describedby={!canBuy ? buyDescId : undefined}
                title={!canBuy ? buyDisabledReason : undefined}
              >
                かう (+1)
              </Button>
              <Button
                size="small"
                variant="secondary"
                onClick={() => onSell(color, SHARES_PER_TRADE)}
                aria-disabled={!canSell}
                aria-describedby={!canSell ? sellDescId : undefined}
                title={!canSell ? 'もっていないよ' : undefined}
              >
                うる (-1)
              </Button>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}

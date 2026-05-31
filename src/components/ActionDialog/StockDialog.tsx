import type { ColorGroup, ColorGroupStock, Player } from '../../game/types';
import Dialog from '../common/Dialog';
import Button from '../common/Button';
import styles from './ActionDialog.module.css';

type StockDialogProps = {
  currentPlayer: Player;
  stockMarket: Partial<Record<ColorGroup, ColorGroupStock>>;
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

export default function StockDialog({
  currentPlayer,
  stockMarket,
  onBuy,
  onSell,
  onClose,
}: StockDialogProps) {
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
        {groups.map((color) => {
          const market = stockMarket[color];
          if (!market) return null;
          const owned = currentPlayer.stocks?.[color] ?? 0;
          const price = market.pricePerShare;
          const canBuy =
            currentPlayer.money >= price &&
            market.bankShares >= SHARES_PER_TRADE;
          const canSell = owned >= SHARES_PER_TRADE;
          return (
            <div key={color} className={styles.propertyInfo}>
              <div className={styles.propertyName}>{COLOR_LABEL[color]}</div>
              <div className={styles.propertyPrice}>
                かかく: ${price} / じぶん: {owned}まい / ぎんこう:{' '}
                {market.bankShares}まい
              </div>
              <Button
                size="small"
                onClick={() => onBuy(color, SHARES_PER_TRADE)}
                aria-disabled={!canBuy}
              >
                かう (+1)
              </Button>
              <Button
                size="small"
                variant="secondary"
                onClick={() => onSell(color, SHARES_PER_TRADE)}
                aria-disabled={!canSell}
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

import { useId } from 'react';
import type { Player } from '../../game/types';
import { sellCrypto } from '../../game/systems/altAssets';
import Dialog from '../common/Dialog';
import Button from '../common/Button';
import styles from './ActionDialog.module.css';

type AltAssetDialogProps = {
  currentPlayer: Player;
  onBuyCrypto: (amount: number) => void;
  onSellCrypto: () => void;
  onInvestVC: (amount: number) => void;
  onBuyESG: (amount: number) => void;
  onSellESG: (index: number) => void;
  onClose: () => void;
};

/** 1 回の購入・投資で使える金額の選択肢。 */
const AMOUNT_OPTIONS = [100, 500] as const;

/**
 * 新アセットクラス（暗号資産・スタートアップ投資・ESG投資）の購入・売却を行うダイアログ。
 *
 * 子供向けメタファー: 暗号資産 = 「ふしぎなコイン」、VC = 「みらいのかいしゃ」、ESG = 「ちきゅうにやさしい投資」。
 * 閉じる操作は必ず `onClose` から行える（`turnPhase: 'altAsset'` から戻る唯一の導線）。
 */
export default function AltAssetDialog({
  currentPlayer,
  onBuyCrypto,
  onSellCrypto,
  onInvestVC,
  onBuyESG,
  onSellESG,
  onClose,
}: AltAssetDialogProps) {
  const baseId = useId();
  const crypto = currentPlayer.cryptoHolding;
  const vcInvestments = currentPlayer.vcInvestments ?? [];
  const esgHoldings = currentPlayer.esgHoldings ?? [];

  /** 金額ごとの購入ボタン行を描画する。所持金不足のときは理由を表示して無効化する。 */
  const renderAmountButtons = (
    idPrefix: string,
    verb: string,
    onSelect: (amount: number) => void,
  ) => (
    <div>
      {AMOUNT_OPTIONS.map((amount) => {
        const isShort = currentPlayer.money < amount;
        const hintId = `${baseId}-${idPrefix}-${amount}`;
        return (
          <span key={amount}>
            {isShort && (
              <span
                id={hintId}
                role="status"
                className={styles.noMoneyHintTight}
              >
                おかねがたりないよ
              </span>
            )}
            <Button
              size="small"
              onClick={() => onSelect(amount)}
              aria-disabled={isShort}
              aria-describedby={isShort ? hintId : undefined}
              title={isShort ? 'おかねがたりないよ' : undefined}
            >
              ${amount}で{verb}
            </Button>
          </span>
        );
      })}
    </div>
  );

  return (
    <Dialog
      title="🪙 あたらしい投資"
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
      </div>

      <div className={styles.propertyInfo}>
        <div className={styles.propertyName}>🪙 ふしぎなコイン（暗号資産）</div>
        <div className={styles.propertyPrice}>
          {crypto
            ? `もっているコイン: ${crypto.units.toFixed(2)}こ / いまのかち: $${sellCrypto(crypto).toLocaleString()}`
            : 'まだもっていないよ'}
        </div>
        {renderAmountButtons('crypto', 'かう', onBuyCrypto)}
        <Button
          size="small"
          variant="secondary"
          onClick={onSellCrypto}
          aria-disabled={!crypto}
          title={!crypto ? 'もっていないよ' : undefined}
        >
          ぜんぶうる
        </Button>
      </div>

      <div className={styles.propertyInfo}>
        <div className={styles.propertyName}>🚀 みらいのかいしゃ（VC投資）</div>
        <div className={styles.propertyPrice}>
          {vcInvestments.length === 0
            ? 'まだとうしていないよ'
            : `とうし中: ${vcInvestments.length}けん（合計 $${vcInvestments
                .reduce((sum, v) => sum + v.amount, 0)
                .toLocaleString()}）`}
        </div>
        {renderAmountButtons('vc', 'とうしする', onInvestVC)}
      </div>

      <div className={styles.propertyInfo}>
        <div className={styles.propertyName}>
          🌱 ちきゅうにやさしい投資（ESG）
        </div>
        {esgHoldings.length === 0 ? (
          <div className={styles.propertyPrice}>まだもっていないよ</div>
        ) : (
          esgHoldings.map((holding, index) => (
            <div key={`${holding.investedTurn}-${index}`}>
              <span className={styles.propertyPrice}>
                ${holding.amount.toLocaleString()}（{holding.investedTurn}
                ターンめ）
              </span>
              <Button
                size="small"
                variant="secondary"
                onClick={() => onSellESG(index)}
                aria-label={`${index + 1}けんめの ESG（$${holding.amount.toLocaleString()}、${holding.investedTurn}ターンめ）をうる`}
              >
                うる
              </Button>
            </div>
          ))
        )}
        {renderAmountButtons('esg', 'かう', onBuyESG)}
      </div>
    </Dialog>
  );
}

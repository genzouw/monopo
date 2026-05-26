import { useId } from 'react';
import type { Player } from '../../game/types';
import Dialog from '../common/Dialog';
import Button from '../common/Button';
import styles from './ActionDialog.module.css';

const JAIL_FINE = 50;

type JailDialogProps = {
  currentPlayer: Player;
  onPayFine: () => void;
  onUseCard: () => void;
  onRollForJail: () => void;
};

export default function JailDialog({
  currentPlayer,
  onPayFine,
  onUseCard,
  onRollForJail,
}: JailDialogProps) {
  const noMoneyHintId = useId();
  const canPayFine = currentPlayer.money >= JAIL_FINE;
  const hasCards = currentPlayer.getOutOfJailCards > 0;
  return (
    <Dialog
      title="🔒 刑務所にいるよ"
      actions={
        <>
          <Button
            onClick={onPayFine}
            disabled={!canPayFine}
            aria-describedby={!canPayFine ? noMoneyHintId : undefined}
          >
            ${JAIL_FINE}はらって出る
          </Button>
          {hasCards && (
            <Button variant="secondary" onClick={onUseCard}>
              カードをつかう
            </Button>
          )}
          <Button variant="secondary" onClick={onRollForJail}>
            🎲 ゾロ目を出して出る
          </Button>
        </>
      }
    >
      <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 15 }}>
        <div>けいむしょにいるよ。</div>
        <div>どうやってでる？</div>
        {!canPayFine && (
          <div
            id={noMoneyHintId}
            role="status"
            className={styles.noMoneyHintTight}
          >
            おかねがたりないよ（${JAIL_FINE}ひつよう）
          </div>
        )}
        {hasCards && (
          <div role="status" className={styles.hasCardHint}>
            しゃほうカードをもってるよ！
          </div>
        )}
      </div>
    </Dialog>
  );
}

import { useId } from 'react';
import type { Player } from '../../game/types';
import { JAIL_FINE } from '../../game/reducer';
import Dialog from '../common/Dialog';
import Button from '../common/Button';
import styles from './ActionDialog.module.css';

/**
 * 罰金不足時の理由メッセージ。ネイティブツールチップ用の `title` と
 * 画面上の補助ヒント（`aria-describedby`）の両方で同じ文言を使い回すことで、
 * 表示内容がずれる（ドリフトする）のを防ぐ。
 */
const noMoneyHintText = `おかねがたりないよ（$${JAIL_FINE}ひつよう）`;

type JailDialogProps = {
  currentPlayer: Player;
  onPayFine: () => void;
  onUseCard: () => void;
  onRollForJail: () => void;
};

/**
 * 刑務所滞在中のプレイヤー向けアクションダイアログ。
 * 「罰金を払って出る」「釈放カードを使う」「ゾロ目チャレンジ」の 3 つの脱出手段を提示し、
 * 所持金が不足している場合は罰金ボタンを無効化したうえで
 * `aria-describedby` で結び付けた補助メッセージから理由を伝える。
 * カスタムボタンは `disabled` ではなく `aria-disabled` でクリックを抑止しているため、
 * ネイティブの `disabled` が持つツールチップ表示が失われる。そのため `title` にも
 * `noMoneyHintText` と同じ理由文言を設定し、マウスユーザーへもホバーで無効理由を伝えられるようにしている。
 * 釈放カードを所持している場合は、その旨をヒントとして併記する。
 */
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
            aria-disabled={!canPayFine}
            aria-describedby={!canPayFine ? noMoneyHintId : undefined}
            title={!canPayFine ? noMoneyHintText : undefined}
          >
            ${JAIL_FINE}はらって出る
          </Button>
          {hasCards && (
            <Button variant="secondary" onClick={onUseCard}>
              カードをつかう（あと {currentPlayer.getOutOfJailCards}まい）
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
          <div id={noMoneyHintId} className={styles.noMoneyHintTight}>
            {noMoneyHintText}
          </div>
        )}
        {hasCards && (
          <div className={styles.hasCardHint}>
            しゃくほうカードを {currentPlayer.getOutOfJailCards}まいもってるよ！
          </div>
        )}
      </div>
    </Dialog>
  );
}

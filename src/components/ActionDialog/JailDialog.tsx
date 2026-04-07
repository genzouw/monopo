import type { Player } from '../../game/types'
import Dialog from '../common/Dialog'
import Button from '../common/Button'

type JailDialogProps = {
  currentPlayer: Player
  onPayFine: () => void
  onUseCard: () => void
  onRollForJail: () => void
}

export default function JailDialog({
  currentPlayer,
  onPayFine,
  onUseCard,
  onRollForJail,
}: JailDialogProps) {
  const canPayFine = currentPlayer.money >= 50
  const hasCards = currentPlayer.getOutOfJailCards > 0
  return (
    <Dialog
      title="🔒 刑務所にいるよ"
      actions={
        <>
          <Button onClick={onPayFine} disabled={!canPayFine}>
            $50はらって出る
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
            style={{ color: 'var(--color-danger)', fontSize: 13, marginTop: 4 }}
          >
            おかねがたりないよ（$50ひつよう）
          </div>
        )}
        {hasCards && (
          <div
            style={{
              color: 'var(--color-success)',
              fontSize: 13,
              marginTop: 4,
            }}
          >
            しゃほうカードをもってるよ！
          </div>
        )}
      </div>
    </Dialog>
  )
}

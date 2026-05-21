import type { Card } from '../../game/types'
import Dialog from '../common/Dialog'
import Button from '../common/Button'
import styles from './ActionDialog.module.css'

type CardDialogProps = {
  card: Card
  onDismiss: () => void
}

export default function CardDialog({ card, onDismiss }: CardDialogProps) {
  const emoji = card.type === 'chance' ? '❓' : '💝'
  const title = card.type === 'chance' ? 'チャンスカード' : 'おたすけカード'
  return (
    <Dialog
      title={title}
      actions={<Button onClick={onDismiss}>わかった！</Button>}
    >
      <div className={styles.cardContent}>
        <div className={styles.cardEmoji}>{emoji}</div>
        <div>{card.text}</div>
      </div>
    </Dialog>
  )
}

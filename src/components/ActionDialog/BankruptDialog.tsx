import Dialog from '../common/Dialog';
import Button from '../common/Button';

type BankruptDialogProps = {
  playerName: string;
  onConfirm: () => void;
};

export default function BankruptDialog({
  playerName,
  onConfirm,
}: BankruptDialogProps) {
  return (
    <Dialog
      title="😢 おかねがなくなった…"
      actions={
        <Button variant="danger" onClick={onConfirm}>
          ゲームオーバー
        </Button>
      }
    >
      <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>😢</div>
        <div>{playerName}はおかねがなくなってしまったよ。</div>
        <div
          style={{
            marginTop: 8,
            color: 'var(--color-text-light)',
            fontSize: 14,
          }}
        >
          もっているぶっけんはぜんぶたいおうするよ。
        </div>
      </div>
    </Dialog>
  );
}

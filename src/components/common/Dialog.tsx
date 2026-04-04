import type { ReactNode } from 'react';
import styles from './common.module.css';

type DialogProps = { title: string; children: ReactNode; actions?: ReactNode };

export default function Dialog({ title, children, actions }: DialogProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.dialogTitle}>{title}</div>
        {children}
        {actions && <div className={styles.dialogActions}>{actions}</div>}
      </div>
    </div>
  );
}

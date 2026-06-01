import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import styles from './common.module.css';

type DialogProps = {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  /** 指定時のみ Escape でクローズ可能。業務的に強制遷移が必要な Dialog（破産・オークション等）では意図的に未指定にする。 */
  onClose?: () => void;
};

export default function Dialog({
  title,
  children,
  actions,
  onClose,
}: DialogProps) {
  const titleId = useId();
  const containerRef = useFocusTrap<HTMLDivElement>();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const closeEnabled = !!onClose;
  useEffect(() => {
    if (!closeEnabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeEnabled]);

  return (
    <div className={styles.overlay}>
      <div
        ref={containerRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div
          id={titleId}
          className={styles.dialogTitle}
          role="heading"
          aria-level={2}
        >
          {title}
        </div>
        <div className={styles.dialogBody}>{children}</div>
        {actions && <div className={styles.dialogActions}>{actions}</div>}
      </div>
    </div>
  );
}

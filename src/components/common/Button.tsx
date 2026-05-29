import type { ButtonHTMLAttributes } from 'react';
import styles from './common.module.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
};

export default function Button({
  variant = 'primary',
  size = 'medium',
  className,
  children,
  ...props
}: ButtonProps) {
  let classes = `${styles.button} ${styles[variant]}`;
  if (size !== 'medium') classes += ` ${styles[size]}`;
  if (className) classes += ` ${className}`;
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

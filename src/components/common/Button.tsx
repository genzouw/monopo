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
  const classes = [
    styles.button,
    styles[variant],
    size !== 'medium' && styles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

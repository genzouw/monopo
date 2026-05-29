import type { ButtonHTMLAttributes } from 'react';
import styles from './common.module.css';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'small' | 'medium' | 'large';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variantClass: Record<Variant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  danger: styles.danger,
  ghost: styles.ghost,
};

const sizeClass: Record<Size, string> = {
  small: styles.small,
  medium: '',
  large: styles.large,
};

export default function Button({
  variant = 'primary',
  size = 'medium',
  className,
  children,
  ...props
}: ButtonProps) {
  const base = `${styles.button} ${variantClass[variant]}`;
  const sized = size === 'medium' ? base : `${base} ${sizeClass[size]}`;
  const classes =
    className === undefined || className === ''
      ? sized
      : `${sized} ${className}`;
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

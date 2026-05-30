import type { ButtonHTMLAttributes, MouseEvent } from 'react';
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
  onClick,
  'aria-disabled': ariaDisabled,
  ...props
}: ButtonProps) {
  let classes = styles.button || '';
  if (styles[variant]) classes += ` ${styles[variant]}`;
  if (size !== 'medium' && styles[size]) classes += ` ${styles[size]}`;
  if (className) classes += ` ${className}`;

  const isAriaDisabled = ariaDisabled === true || ariaDisabled === 'true';

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isAriaDisabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      className={classes}
      onClick={handleClick}
      aria-disabled={ariaDisabled}
      {...props}
    >
      {children}
    </button>
  );
}

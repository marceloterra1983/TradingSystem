import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

export type ButtonVariant = 'default' | 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  asChild?: boolean;
}

const primaryStyles =
  'bg-primary-500 text-white hover:bg-primary-600 focus-visible:ring-primary-500 disabled:bg-primary-300';

const variantClasses: Record<ButtonVariant, string> = {
  default: primaryStyles,
  primary: primaryStyles,
  secondary:
    'bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
  outline:
    'border border-slate-200 bg-white hover:bg-slate-100 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800',
  destructive:
    'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500 disabled:bg-red-300'
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10'
};

const renderSpinner = (className?: string) => (
  <span
    className={twMerge(
      'mr-2 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent',
      className
    )}
  />
);

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const classes = twMerge(
      'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
      variantClasses[variant],
      sizeClasses[size],
      clsx(className, { 'pointer-events-none opacity-80': isLoading })
    );

    const { type, ...restProps } = props;

    if (asChild) {
      return (
        <Slot ref={ref} className={classes} {...restProps}>
          {isLoading && renderSpinner()}
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || isLoading}
        type={typeof type === 'string' ? type : 'button'}
        {...restProps}
      >
        {isLoading && renderSpinner(variant === 'default' || variant === 'primary' ? 'border-white' : undefined)}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

import * as React from 'react';
import clsx from 'clsx';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const badgeStyles: Record<BadgeVariant, string> = {
  default: 'bg-primary-100 text-primary-700 dark:bg-primary-900/60 dark:text-primary-200',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200',
  danger: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200',
  outline:
    'border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300 dark:bg-transparent'
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <span
      ref={ref}
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
        badgeStyles[variant],
        className
      )}
      {...props}
    />
  )
);

Badge.displayName = 'Badge';

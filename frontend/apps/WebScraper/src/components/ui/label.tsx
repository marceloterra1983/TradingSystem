import { forwardRef } from 'react';
import type { LabelHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={clsx(
        'text-sm font-medium leading-none text-slate-700 dark:text-slate-300',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    />
  );
});

Label.displayName = 'Label';

export default Label;

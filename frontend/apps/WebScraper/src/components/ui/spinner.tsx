import clsx from 'clsx';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]'
};

export function Spinner({ className, size = 'md' }: SpinnerProps) {
  return (
    <span
      className={clsx(
        'inline-block animate-spin rounded-full border-primary-500 border-t-transparent',
        sizeMap[size],
        className
      )}
    />
  );
}

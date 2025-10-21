import * as React from 'react';
import { twMerge } from 'tailwind-merge';

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={twMerge(
          'w-full border-collapse text-left text-sm text-slate-700 dark:text-slate-200',
          className
        )}
        {...props}
      />
    </div>
  );
}

export function THead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={twMerge('bg-slate-50 dark:bg-slate-900/40', className)} {...props} />;
}

export function TBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={twMerge('divide-y divide-slate-100 dark:divide-slate-800', className)} {...props} />;
}

export function TR({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={twMerge(
        'transition hover:bg-slate-50/60 dark:hover:bg-slate-800/60',
        className
      )}
      {...props}
    />
  );
}

export function TH({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={twMerge(
        'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400',
        className
      )}
      {...props}
    />
  );
}

export function TD({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={twMerge('px-4 py-3 align-middle text-sm', className)} {...props} />
  );
}

export const TableHeader = THead;
export const TableBody = TBody;
export const TableRow = TR;
export const TableHead = TH;
export const TableCell = TD;

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClasses = {
    default:
      "border-transparent bg-[color:var(--ts-surface-hover)] text-[color:var(--ts-text-secondary)]",
    secondary:
      "border border-[color:var(--ts-surface-border)] bg-transparent text-[color:var(--ts-text-secondary)]",
    destructive:
      "border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    outline:
      "border border-[color:var(--ts-surface-border)] text-[color:var(--ts-text-secondary)]",
    success:
      "border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    warning:
      "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };

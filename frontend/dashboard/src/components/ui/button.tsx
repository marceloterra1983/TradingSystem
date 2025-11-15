import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "primary";
  size?: "sm" | "md" | "lg" | "icon";
  children: ReactNode;
}

/**
 * Button component following shadcn/ui patterns
 *
 * @example
 * ```tsx
 * <Button variant="default" size="md">Execute Order</Button>
 * <Button variant="outline" size="sm">Cancel</Button>
 * <Button variant="destructive">Kill Switch</Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "md", children, ...props },
    ref,
  ) => {
    const variantClasses = {
      default:
        "bg-[color:var(--ts-accent)] text-white hover:bg-[color:var(--ts-accent-strong)]",
      outline:
        "border border-[color:var(--ts-surface-border)] bg-[color:var(--ts-surface-0)] text-[color:var(--ts-text-secondary)] hover:bg-[color:var(--ts-surface-hover)]",
      ghost:
        "text-[color:var(--ts-text-secondary)] hover:bg-[color:var(--ts-surface-hover)]",
      destructive:
        "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-600",
      primary:
        "bg-[color:var(--ts-accent)] text-white hover:bg-[color:var(--ts-accent-strong)]",
    };

    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
      icon: "h-9 w-9 p-0",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[color:var(--ts-accent)] focus:ring-offset-2 focus:ring-offset-[color:var(--ts-surface-0)] disabled:cursor-not-allowed disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;

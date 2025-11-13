import {
  forwardRef,
  type InputHTMLAttributes,
} from "react";
import { cn } from "../../lib/utils";

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement> {}

/**
 * Input component following shadcn/ui patterns
 *
 * @example
 * ```tsx
 * <Input type="text" placeholder="Enter symbol..." />
 * <Input type="number" min="0" step="0.01" />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border px-3 py-2 text-sm transition-colors",
          "border-[color:var(--ts-control-border)] bg-[color:var(--ts-control-bg)] text-[color:var(--ts-text-primary)]",
          "placeholder:text-[color:var(--ts-control-placeholder)]",
          "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--ts-accent)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export default Input;

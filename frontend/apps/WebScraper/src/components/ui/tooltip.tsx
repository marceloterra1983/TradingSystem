import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { twMerge } from 'tailwind-merge';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={twMerge(
      'z-50 overflow-hidden rounded-md border border-slate-200 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 shadow-md animate-in fade-in-0 zoom-in-95 dark:border-slate-700 dark:bg-slate-800',
      className
    )}
    {...props}
  />
));

TooltipContent.displayName = TooltipPrimitive.Content.displayName;

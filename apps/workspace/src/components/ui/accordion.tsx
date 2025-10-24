import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

type AccordionContextValue = {
  type: 'single' | 'multiple';
  value: string | string[];
  onValueChange: (value: string) => void;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

function useAccordionContext() {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be used within Accordion');
  }
  return context;
}

export interface AccordionProps {
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  className?: string;
  children: React.ReactNode;
}

/**
 * Accordion component for collapsible sections
 *
 * @example
 * ```tsx
 * <Accordion type="multiple" defaultValue={['item-1']}>
 *   <AccordionItem value="item-1">
 *     <AccordionTrigger>Section 1</AccordionTrigger>
 *     <AccordionContent>Content for section 1</AccordionContent>
 *   </AccordionItem>
 * </Accordion>
 * ```
 */
export function Accordion({
  type = 'multiple',
  defaultValue = [],
  className,
  children,
}: AccordionProps) {
  const [value, setValue] = React.useState<string | string[]>(
    type === 'single' ? (Array.isArray(defaultValue) ? defaultValue[0] || '' : defaultValue) :
    (Array.isArray(defaultValue) ? defaultValue : [defaultValue])
  );

  const onValueChange = React.useCallback((itemValue: string) => {
    setValue((prev) => {
      if (type === 'single') {
        return prev === itemValue ? '' : itemValue;
      } else {
        const prevArray = prev as string[];
        if (prevArray.includes(itemValue)) {
          return prevArray.filter((v) => v !== itemValue);
        }
        return [...prevArray, itemValue];
      }
    });
  }, [type]);

  return (
    <AccordionContext.Provider value={{ type, value, onValueChange }}>
      <div className={cn('space-y-4', className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

// Context for AccordionItem value
const AccordionItemContext = React.createContext<string>('');

export interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children: React.ReactNode;
}

export const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, className, children, ...props }, ref) => {
    return (
      <AccordionItemContext.Provider value={value}>
        <div
          ref={ref}
          className={cn('border border-gray-200 rounded-2xl bg-white overflow-hidden dark:border-gray-700 dark:bg-gray-900', className)}
          data-value={value}
          {...props}
        >
          {children}
        </div>
      </AccordionItemContext.Provider>
    );
  }
);

AccordionItem.displayName = 'AccordionItem';

export interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const context = useAccordionContext();
    const itemValue = React.useContext(AccordionItemContext);

    const isOpen = context.type === 'single'
      ? context.value === itemValue
      : (context.value as string[]).includes(itemValue);

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'flex w-full items-center justify-between px-6 py-4 text-left font-medium transition-all hover:bg-gray-50 dark:hover:bg-gray-800',
          className
        )}
        onClick={() => context.onValueChange(itemValue)}
        aria-expanded={isOpen}
        {...props}
      >
        <span className="text-base font-semibold text-gray-900 dark:text-gray-100">{children}</span>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
    );
  }
);

AccordionTrigger.displayName = 'AccordionTrigger';

export interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children, ...props }, ref) => {
    const context = useAccordionContext();
    const itemValue = React.useContext(AccordionItemContext);

    const isOpen = context.type === 'single'
      ? context.value === itemValue
      : (context.value as string[]).includes(itemValue);

    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'px-6 pb-4 pt-0 border-t border-gray-100 dark:border-gray-800',
          'animate-in slide-in-from-top-2 duration-200',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

AccordionContent.displayName = 'AccordionContent';

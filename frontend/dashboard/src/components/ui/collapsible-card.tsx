import * as React from 'react';
import { cn } from '../../lib/utils';
import { isBrowser, safeLocalStorageGet, safeLocalStorageSet } from '../../utils/browser';

export interface CollapsibleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  cardId?: string;
}

export const CollapsibleCard = React.forwardRef<HTMLDivElement, CollapsibleCardProps>(
  ({ className, children, defaultCollapsed = false, cardId, ...props }, ref) => {
    const [isCollapsed, setIsCollapsed] = React.useState(() => {
      if (cardId) {
        const stored = safeLocalStorageGet(`card-collapsed-${cardId}`);
        if (!stored) {
          return defaultCollapsed;
        }
        try {
          return JSON.parse(stored);
        } catch {
          return defaultCollapsed;
        }
      }
      return defaultCollapsed;
    });

    // Listen to collapse-all-cards event for collapse/expand all functionality
    React.useEffect(() => {
      if (!cardId || !isBrowser) return;

      const handleCollapseAll = (event: Event) => {
        const customEvent = event as CustomEvent<{ collapsed: boolean }>;
        const newState = customEvent.detail.collapsed;
        setIsCollapsed(newState);
      };

      window.addEventListener('collapse-all-cards', handleCollapseAll);
      return () => window.removeEventListener('collapse-all-cards', handleCollapseAll);
    }, [cardId]);

    const toggleCollapsed = () => {
      const newState = !isCollapsed;
      setIsCollapsed(newState);
      if (cardId) {
        safeLocalStorageSet(`card-collapsed-${cardId}`, JSON.stringify(newState));
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-900 dark:border-gray-700',
          'transition-all duration-200',
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (
            React.isValidElement<CollapsibleCardHeaderProps>(child) &&
            child.type === CollapsibleCardHeader
          ) {
            return React.cloneElement(child, {
              isCollapsed,
              onToggle: toggleCollapsed,
            });
          }

          if (
            React.isValidElement<CollapsibleCardContentProps>(child) &&
            child.type === CollapsibleCardContent
          ) {
            return React.cloneElement(child, {
              isCollapsed,
            });
          }

          return child;
        })}
      </div>
    );
  }
);

CollapsibleCard.displayName = 'CollapsibleCard';

export interface CollapsibleCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export const CollapsibleCardHeader = React.forwardRef<HTMLDivElement, CollapsibleCardHeaderProps>(
  ({ className, children, isCollapsed, onToggle, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-6 py-4 border-b border-gray-200 dark:border-gray-700',
          'flex items-center justify-between transition-colors',
          isCollapsed && 'border-b-0',
          'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50',
          className
        )}
        onClick={onToggle}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CollapsibleCardHeader.displayName = 'CollapsibleCardHeader';

export interface CollapsibleCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export const CollapsibleCardTitle = React.forwardRef<HTMLHeadingElement, CollapsibleCardTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn('text-lg font-semibold text-gray-900 dark:text-gray-100', className)}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

CollapsibleCardTitle.displayName = 'CollapsibleCardTitle';

export interface CollapsibleCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const CollapsibleCardDescription = React.forwardRef<HTMLParagraphElement, CollapsibleCardDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-gray-600 mt-1 dark:text-gray-400', className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CollapsibleCardDescription.displayName = 'CollapsibleCardDescription';

export interface CollapsibleCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  isCollapsed?: boolean;
}

export const CollapsibleCardContent = React.forwardRef<HTMLDivElement, CollapsibleCardContentProps>(
  ({ className, children, isCollapsed, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'overflow-hidden transition-all duration-200',
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'
        )}
      >
        <div className={cn('px-6 py-4', className)} {...props}>
          {children}
        </div>
      </div>
    );
  }
);

CollapsibleCardContent.displayName = 'CollapsibleCardContent';

export interface CollapsibleCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CollapsibleCardFooter = React.forwardRef<HTMLDivElement, CollapsibleCardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('px-6 py-4 border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-950', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CollapsibleCardFooter.displayName = 'CollapsibleCardFooter';

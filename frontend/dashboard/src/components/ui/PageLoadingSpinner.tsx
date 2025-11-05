/**
 * Page Loading Spinner
 * Used as fallback for lazy-loaded route components
 */

export function PageLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {/* Animated spinner */}
          <div className="w-16 h-16 border-4 border-muted rounded-full border-t-primary animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">
          Carregando página...
        </p>
      </div>
    </div>
  );
}

/**
 * Compact loading indicator for component-level lazy loading
 */
export function ComponentLoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 border-3 border-muted rounded-full border-t-primary animate-spin" />
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for data-heavy components
 */
export function PageLoadingSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 bg-muted rounded w-1/3" />

      {/* Content skeleton */}
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-4/6" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-32 bg-muted rounded" />
        ))}
      </div>
    </div>
  );
}

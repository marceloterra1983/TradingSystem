export function LayoutHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-900">
      {/* Version Badge Only */}
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-medium text-cyan-600 dark:text-cyan-400">
          v0.1.0
        </span>
      </div>

      {/* Right Section - Empty (theme inherited from Dashboard) */}
      <div className="flex items-center gap-3">
        {/* Theme toggle removed - uses Dashboard's theme automatically */}
      </div>
    </header>
  );
}

import { Fragment } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import type { NavigationItem } from '../../constants/navigation';

interface SidebarProps {
  items: NavigationItem[];
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ items, collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={clsx(
        'relative z-20 flex h-screen flex-col border-r border-slate-200 bg-white/90 backdrop-blur-lg transition-all duration-200 dark:border-slate-800 dark:bg-slate-900/70',
        collapsed ? 'w-[80px]' : 'w-72'
      )}
    >
      <div className="flex items-center justify-between px-4 py-5">
        <div className={clsx('flex items-center gap-3', collapsed && 'justify-center w-full')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-200">
            <span className="text-xl font-bold">WS</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">WebScraper</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">AI-powered scraping suite</p>
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label="Toggle sidebar"
          onClick={onToggle}
          className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="mt-4 flex-1 space-y-2 px-3">
        {items.map(item => {
          const Icon = item.icon;
          const link = (
            <NavLink
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                clsx(
                  'group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                  isActive
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                  collapsed && 'justify-center px-0'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={clsx(
                      'h-5 w-5 flex-shrink-0 transition',
                      isActive ? 'text-white' : 'text-primary-500 group-hover:text-primary-600'
                    )}
                  />
                  {!collapsed && (
                    <span className="flex-1 text-left">
                      {item.label}
                      <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">
                        {item.description}
                      </span>
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
          if (!collapsed) {
            return <Fragment key={item.id}>{link}</Fragment>;
          }

          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">
                <div className="max-w-[200px]">
                  <p className="text-xs font-semibold">{item.label}</p>
                  <p className="mt-1 text-[11px] text-slate-300">{item.description}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 bg-slate-50/60 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
        {!collapsed ? (
          <div>
            <p className="font-semibold text-slate-600 dark:text-slate-200">Standalone Mode</p>
            <p className="mt-1 leading-relaxed">
              Ready to embed in the TradingSystem dashboard or operate standalone on port 3800.
            </p>
          </div>
        ) : (
          <p className="text-center leading-4">
            Standalone
            <br />
            Mode
          </p>
        )}
      </div>
    </aside>
  );
}

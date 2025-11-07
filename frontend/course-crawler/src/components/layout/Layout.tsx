import * as React from 'react';
import { LayoutHeader } from './LayoutHeader';

export interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Main Layout Component
 *
 * Features:
 * - Simple two-row layout (Header + Main Content)
 * - Responsive design
 * - All functionality in single-page cards
 *
 * Usage:
 * ```tsx
 * <Layout>
 *   <YourContent />
 * </Layout>
 * ```
 */
export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <LayoutHeader />

      {/* Page Content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}

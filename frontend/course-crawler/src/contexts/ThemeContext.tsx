import * as React from 'react';
import { isBrowser } from '../utils/browser';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined,
);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const getSystemTheme = React.useCallback((): ResolvedTheme => {
    if (!isBrowser || !window.matchMedia) {
      return 'dark'; // Default to dark when used in iframe
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }, []);

  // Always use 'system' theme - no local storage override
  const [theme] = React.useState<Theme>('system');

  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>(
    () => {
      const resolved = getSystemTheme();
      if (isBrowser) {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(resolved);
      }
      return resolved;
    },
  );

  React.useEffect(() => {
    if (!isBrowser) {
      return;
    }
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  // Theme setters are no-ops since we always follow system theme
  const setTheme = React.useCallback(() => {
    // No-op: theme is always 'system'
  }, []);

  const toggleTheme = React.useCallback(() => {
    // No-op: theme is always 'system'
  }, []);

  React.useEffect(() => {
    if (!isBrowser) {
      return;
    }
    if (theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const systemTheme = getSystemTheme();
      setResolvedTheme(systemTheme);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme, getSystemTheme]);

  const value = React.useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useUIStore, type Theme } from '@/stores/uiStore';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark' | 'oled-dark';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useUIStore();

  // Resolve system theme
  const resolvedTheme =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Remove all theme classes
    root.classList.remove('light', 'dark', 'oled-dark');

    // Add current theme
    if (resolvedTheme === 'oled-dark') {
      root.classList.add('dark', 'oled-dark');
    } else {
      root.classList.add(resolvedTheme);
    }

    // Set meta theme color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        resolvedTheme === 'light' ? '#f9fafb' : '#030712'
      );
    }
  }, [resolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      // Force re-render by triggering state update
      setTheme('system');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

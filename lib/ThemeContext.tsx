import { createContext, useContext, useState, ReactNode } from 'react';
import { lightTheme, darkTheme, Theme } from '../constants/theme';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const value: ThemeContextValue = {
    theme: isDark ? darkTheme : lightTheme,
    isDark,
    toggleTheme: () => setIsDark((prev) => !prev),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
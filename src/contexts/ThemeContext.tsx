import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, DarkColors, PinkColors, TealColors } from '../constants/theme';

type Theme = 'light' | 'dark' | 'pink' | 'teal';

const THEME_MAP: Record<Theme, typeof Colors> = {
  light: Colors,
  dark: DarkColors,
  pink: PinkColors,
  teal: TealColors,
};

const VALID_THEMES: Theme[] = ['light', 'dark', 'pink', 'teal'];

interface ThemeContextType {
  theme: Theme;
  colors: typeof Colors;
  toggleTheme: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@glow/theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved && VALID_THEMES.includes(saved as Theme)) {
        setThemeState(saved as Theme);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  };

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const idx = VALID_THEMES.indexOf(theme);
    const nextTheme = VALID_THEMES[(idx + 1) % VALID_THEMES.length];
    await setTheme(nextTheme);
  }, [theme, setTheme]);

  const colors = THEME_MAP[theme];

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

const defaultThemeContext: ThemeContextType = {
  theme: 'light',
  colors: Colors,
  toggleTheme: async () => {},
  setTheme: async () => {},
};

export function useTheme() {
  const context = useContext(ThemeContext);
  return context ?? defaultThemeContext;
}

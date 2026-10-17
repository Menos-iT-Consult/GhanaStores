import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated } from 'react-native';
import type { MD3Theme } from 'react-native-paper';
import { darkTheme, lightTheme } from '@/theme';

/** 'light' or 'dark' — persisted to AsyncStorage so the choice survives relaunch. */
export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  /** The active react-native-paper MD3 theme. */
  theme: MD3Theme;
  toggleTheme: () => void;
  /** Spring-animated 0..1 value for the toggle's sun/moon rotation. */
  toggleAnim: Animated.Value;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'didwa.theme_mode';

const fallback: ThemeContextValue = {
  mode: 'light',
  isDark: false,
  theme: lightTheme,
  toggleTheme: () => undefined,
  toggleAnim: new Animated.Value(0),
};

/**
 * Persisted light/dark theme provider. Wrap the app root with this and pass
 * `value.theme` to <PaperProvider theme={...}>. Toggling runs a subtle spring
 * animation on the toggle's rotation and writes the preference to disk.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [hydrated, setHydrated] = useState(false);

  const toggleAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const next: ThemeMode = raw === 'dark' ? 'dark' : 'light';
        setMode(next);
      })
      .finally(() => setHydrated(true));
  }, []);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
      Animated.spring(toggleAnim, {
        toValue: prev === 'light' ? 1 : 0,
        useNativeDriver: true,
        speed: 28,
        bounciness: 14,
      }).start();
      return next;
    });
  }, [toggleAnim]);

  const theme = useMemo<MD3Theme>(() => (mode === 'dark' ? darkTheme : lightTheme), [mode]);
  const isDark = mode === 'dark';

  const value: ThemeContextValue = useMemo(
    () => ({ mode, isDark, theme, toggleTheme, toggleAnim }),
    [mode, isDark, theme, toggleTheme, toggleAnim],
  );

  // Before hydration completes we still provide a sensible light-mode value so
  // PaperProvider and consumers never render null.
  return (
    <ThemeContext.Provider value={hydrated ? value : fallback}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode must be used within <ThemeProvider>');
  return ctx;
}

export { lightTheme, darkTheme };

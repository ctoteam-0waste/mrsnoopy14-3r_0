import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, ThemeColors } from './colors';

// Theme mode the user picked. 'system' follows the OS setting; 'light'/'dark' force it.
export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  mode: ThemeMode;      // the user's choice
  isDark: boolean;      // the resolved theme right now
  colors: ThemeColors;  // the active token set
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  isDark: false,
  colors: lightColors,
  setMode: () => {},
});

const STORAGE_KEY = 'themeMode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Restore the saved choice once on mount.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
      })
      .catch(() => {});
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const value = useMemo(
    () => ({ mode, isDark, colors, setMode }),
    [mode, isDark, colors, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

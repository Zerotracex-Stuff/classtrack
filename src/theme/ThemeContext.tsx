import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { AccentColorKey, ThemeMode } from '../types';
import { ACCENT_PALETTES, LIGHT_SURFACE, DARK_SURFACE, STATUS_COLORS } from './colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderSubtle: string;
  card: string;
  ripple: string;
  present: string;
  presentBg: string;
  absent: string;
  absentBg: string;
  cancelled: string;
  cancelledBg: string;
  info: string;
  infoBg: string;
}

interface ThemeContextType {
  isDark: boolean;
  themeMode: ThemeMode;
  accentColor: AccentColorKey;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (accent: AccentColorKey) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_MODE_KEY = '@classtrack_theme_mode';
const ACCENT_COLOR_KEY = '@classtrack_accent_color';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [accentColor, setAccentColorState] = useState<AccentColorKey>('indigo');

  useEffect(() => {
    // Load stored preferences
    (async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_MODE_KEY);
        if (savedMode && (savedMode === 'system' || savedMode === 'light' || savedMode === 'dark')) {
          setThemeModeState(savedMode as ThemeMode);
        }
        const savedAccent = await AsyncStorage.getItem(ACCENT_COLOR_KEY);
        if (savedAccent && savedAccent in ACCENT_PALETTES) {
          setAccentColorState(savedAccent as AccentColorKey);
        }
      } catch (err) {
        console.warn('Failed to load theme settings', err);
      }
    })();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, mode);
    } catch (e) {
      console.warn(e);
    }
  };

  const setAccentColor = async (accent: AccentColorKey) => {
    setAccentColorState(accent);
    try {
      await AsyncStorage.setItem(ACCENT_COLOR_KEY, accent);
    } catch (e) {
      console.warn(e);
    }
  };

  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  const colors = useMemo<ThemeColors>(() => {
    const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.indigo;
    const accentTheme = isDark ? palette.dark : palette.light;
    const surfaceTheme = isDark ? DARK_SURFACE : LIGHT_SURFACE;

    return {
      ...accentTheme,
      ...surfaceTheme,
      ...STATUS_COLORS,
    };
  }, [accentColor, isDark]);

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        themeMode,
        accentColor,
        colors,
        setThemeMode,
        setAccentColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

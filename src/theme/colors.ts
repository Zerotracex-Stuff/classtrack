import { AccentColorKey } from '../types';

export interface ColorPalette {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
}

export const ACCENT_PALETTES: Record<AccentColorKey, { name: string; light: ColorPalette; dark: ColorPalette }> = {
  indigo: {
    name: 'Classic Indigo',
    light: {
      primary: '#4F46E5',
      onPrimary: '#FFFFFF',
      primaryContainer: '#EEF2FF',
      onPrimaryContainer: '#312E81',
      secondary: '#6366F1',
      secondaryContainer: '#E0E7FF',
      onSecondaryContainer: '#1E1B4B',
    },
    dark: {
      primary: '#818CF8',
      onPrimary: '#1E1B4B',
      primaryContainer: '#312E81',
      onPrimaryContainer: '#EEF2FF',
      secondary: '#A5B4FC',
      secondaryContainer: '#3730A3',
      onSecondaryContainer: '#E0E7FF',
    },
  },
  emerald: {
    name: 'Emerald Forest',
    light: {
      primary: '#059669',
      onPrimary: '#FFFFFF',
      primaryContainer: '#ECFDF5',
      onPrimaryContainer: '#064E3B',
      secondary: '#10B981',
      secondaryContainer: '#D1FAE5',
      onSecondaryContainer: '#064E3B',
    },
    dark: {
      primary: '#34D399',
      onPrimary: '#064E3B',
      primaryContainer: '#065F46',
      onPrimaryContainer: '#ECFDF5',
      secondary: '#6EE7B7',
      secondaryContainer: '#047857',
      onSecondaryContainer: '#D1FAE5',
    },
  },
  violet: {
    name: 'Electric Violet',
    light: {
      primary: '#7C3AED',
      onPrimary: '#FFFFFF',
      primaryContainer: '#F5F3FF',
      onPrimaryContainer: '#4C1D95',
      secondary: '#8B5CF6',
      secondaryContainer: '#EDE9FE',
      onSecondaryContainer: '#2E1065',
    },
    dark: {
      primary: '#A78BFA',
      onPrimary: '#2E1065',
      primaryContainer: '#5B21B6',
      onPrimaryContainer: '#F5F3FF',
      secondary: '#C4B5FD',
      secondaryContainer: '#4C1D95',
      onSecondaryContainer: '#EDE9FE',
    },
  },
  amber: {
    name: 'Golden Amber',
    light: {
      primary: '#D97706',
      onPrimary: '#FFFFFF',
      primaryContainer: '#FFFBEB',
      onPrimaryContainer: '#78350F',
      secondary: '#F59E0B',
      secondaryContainer: '#FEF3C7',
      onSecondaryContainer: '#451A03',
    },
    dark: {
      primary: '#FBBF24',
      onPrimary: '#451A03',
      primaryContainer: '#78350F',
      onPrimaryContainer: '#FEF3C7',
      secondary: '#FCD34D',
      secondaryContainer: '#92400E',
      onSecondaryContainer: '#FFFBEB',
    },
  },
  crimson: {
    name: 'Ruby Crimson',
    light: {
      primary: '#E11D48',
      onPrimary: '#FFFFFF',
      primaryContainer: '#FFF1F2',
      onPrimaryContainer: '#881337',
      secondary: '#F43F5E',
      secondaryContainer: '#FFE4E6',
      onSecondaryContainer: '#4C0519',
    },
    dark: {
      primary: '#FB7185',
      onPrimary: '#4C0519',
      primaryContainer: '#881337',
      onPrimaryContainer: '#FFE4E6',
      secondary: '#FDA4AF',
      secondaryContainer: '#9F1239',
      onSecondaryContainer: '#FFF1F2',
    },
  },
  sky: {
    name: 'Sky Blue',
    light: {
      primary: '#0284C7',
      onPrimary: '#FFFFFF',
      primaryContainer: '#F0F9FF',
      onPrimaryContainer: '#0C4A6E',
      secondary: '#0EA5E9',
      secondaryContainer: '#E0F2FE',
      onSecondaryContainer: '#082F49',
    },
    dark: {
      primary: '#38BDF8',
      onPrimary: '#082F49',
      primaryContainer: '#075985',
      onPrimaryContainer: '#F0F9FF',
      secondary: '#7DD3FC',
      secondaryContainer: '#0369A1',
      onSecondaryContainer: '#E0F2FE',
    },
  },
  teal: {
    name: 'Ocean Teal',
    light: {
      primary: '#0D9488',
      onPrimary: '#FFFFFF',
      primaryContainer: '#F0FDFA',
      onPrimaryContainer: '#134E4A',
      secondary: '#14B8A6',
      secondaryContainer: '#CCFBF1',
      onSecondaryContainer: '#042F2E',
    },
    dark: {
      primary: '#2DD4BF',
      onPrimary: '#042F2E',
      primaryContainer: '#115E59',
      onPrimaryContainer: '#F0FDFA',
      secondary: '#5EEAD4',
      secondaryContainer: '#134E4A',
      onSecondaryContainer: '#CCFBF1',
    },
  },
  coral: {
    name: 'Sunset Coral',
    light: {
      primary: '#EA580C',
      onPrimary: '#FFFFFF',
      primaryContainer: '#FFF7ED',
      onPrimaryContainer: '#7C2D12',
      secondary: '#F97316',
      secondaryContainer: '#FFEDD5',
      onSecondaryContainer: '#431407',
    },
    dark: {
      primary: '#FB923C',
      onPrimary: '#431407',
      primaryContainer: '#7C2D12',
      onPrimaryContainer: '#FFEDD5',
      secondary: '#FDBA74',
      secondaryContainer: '#9A3412',
      onSecondaryContainer: '#FFF7ED',
    },
  },
};

export const LIGHT_SURFACE = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  surfaceContainer: '#FFFFFF',
  surfaceContainerHigh: '#F8FAFC',
  text: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  card: '#FFFFFF',
  ripple: 'rgba(0, 0, 0, 0.06)',
};

export const DARK_SURFACE = {
  background: '#0B0F19',
  surface: '#121826',
  surfaceVariant: '#1A2234',
  surfaceContainer: '#161E30',
  surfaceContainerHigh: '#1E283E',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  border: '#232D42',
  borderSubtle: '#1A2234',
  card: '#141B2D',
  ripple: 'rgba(255, 255, 255, 0.08)',
};

export const STATUS_COLORS = {
  present: '#10B981',
  presentBg: 'rgba(16, 185, 129, 0.12)',
  absent: '#EF4444',
  absentBg: 'rgba(239, 68, 68, 0.12)',
  cancelled: '#F59E0B',
  cancelledBg: 'rgba(245, 158, 11, 0.12)',
  info: '#3B82F6',
  infoBg: 'rgba(59, 130, 246, 0.12)',
};

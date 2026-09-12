import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'outlined' | 'filled';
  elevation?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'elevated',
  elevation = 1,
}) => {
  const { colors, isDark } = useTheme();

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'filled':
        return {
          backgroundColor: colors.surfaceVariant,
          borderWidth: 0,
        };
      case 'elevated':
      default:
        return {
          backgroundColor: colors.card,
          borderWidth: isDark ? 1 : 0,
          borderColor: colors.borderSubtle,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: elevation * 2 },
          shadowOpacity: isDark ? 0.3 : 0.06,
          shadowRadius: elevation * 4,
          elevation: elevation * 2,
        };
    }
  };

  return (
    <View style={[styles.card, getVariantStyle(), style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    marginVertical: 6,
  },
});

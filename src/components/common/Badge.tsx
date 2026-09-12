import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'neutral';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  icon,
  style,
}) => {
  const { colors } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return { bg: colors.primaryContainer, text: colors.onPrimaryContainer };
      case 'secondary':
        return { bg: colors.secondaryContainer, text: colors.onSecondaryContainer };
      case 'success':
        return { bg: colors.presentBg, text: colors.present };
      case 'danger':
        return { bg: colors.absentBg, text: colors.absent };
      case 'warning':
        return { bg: colors.cancelledBg, text: colors.cancelled };
      case 'neutral':
      default:
        return { bg: colors.surfaceVariant, text: colors.textSecondary };
    }
  };

  const c = getColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: c.bg },
        size === 'sm' ? styles.smContainer : styles.mdContainer,
        style,
      ]}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text
        style={[
          styles.text,
          { color: c.text },
          size === 'sm' ? styles.smText : styles.mdText,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
  },
  smContainer: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mdContainer: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '600',
  },
  smText: {
    fontSize: 11,
  },
  mdText: {
    fontSize: 13,
  },
});

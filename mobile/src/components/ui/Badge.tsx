import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'primary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: Colors.surfaceLight, text: Colors.textSecondary },
  success: { bg: 'rgba(16, 185, 129, 0.15)', text: Colors.success },
  error: { bg: 'rgba(239, 68, 68, 0.15)', text: Colors.error },
  warning: { bg: 'rgba(245, 158, 11, 0.15)', text: Colors.warning },
  info: { bg: 'rgba(0, 217, 255, 0.15)', text: Colors.accent },
  primary: { bg: 'rgba(108, 99, 255, 0.15)', text: Colors.primary },
};

export function Badge({ label, variant = 'default', size = 'sm', style }: BadgeProps) {
  const colors = variantColors[variant];

  return (
    <View
      style={[
        styles.base,
        size === 'md' && styles.md,
        { backgroundColor: colors.bg },
        style,
      ]}
    >
      <Text style={[styles.text, size === 'md' && styles.textMd, { color: colors.text }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  md: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  text: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textMd: {
    fontSize: Typography.sizes.sm,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Typography, Spacing } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface ProgressRingProps {
  completed: number;
  total: number;
  size?: number;
}

export function ProgressRing({ completed, total, size = 100 }: ProgressRingProps) {
  const { colors } = useTheme();
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const borderWidth = Math.max(Math.round(size * 0.08), 3);
  const fontSize = Math.max(Math.round(size * 0.28), 12);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth,
            borderColor: colors.surfaceSecondary,
          },
        ]}
      />
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth,
            borderColor: colors.primary,
            opacity: Math.max(percentage / 100, 0.15),
          },
        ]}
      />
      <Text style={[styles.label, { fontSize, color: colors.text }]}>
        {completed}<Text style={[styles.separator, { fontSize: fontSize * 0.7, color: colors.textLight }]}>/</Text>{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
  label: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  separator: {
    fontWeight: '400',
  },
});

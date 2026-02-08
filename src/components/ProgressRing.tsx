import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../constants/theme';

interface ProgressRingProps {
  completed: number;
  total: number;
  size?: number;
}

export function ProgressRing({ completed, total, size = 100 }: ProgressRingProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background ring */}
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: Colors.surfaceSecondary,
          },
        ]}
      />
      {/* Progress ring */}
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: Colors.primary,
            opacity: Math.max(percentage / 100, 0.15),
          },
        ]}
      />
      {/* Center content */}
      <View style={styles.center}>
        <Text style={styles.percentage}>{percentage}%</Text>
        <Text style={styles.fraction}>
          {completed}/{total}
        </Text>
      </View>
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
    borderWidth: 6,
  },
  center: {
    alignItems: 'center',
  },
  percentage: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  fraction: {
    ...Typography.caption,
    marginTop: 2,
    fontSize: 11,
  },
});

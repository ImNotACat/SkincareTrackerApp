import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { CATEGORY_INFO } from '../constants/skincare';
import type { TodayStep } from '../types';

interface StepCardProps {
  step: TodayStep;
  onToggle: (id: string) => void;
  onPress?: (step: TodayStep) => void;
}

export function StepCard({ step, onToggle, onPress }: StepCardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const category = CATEGORY_INFO[step.category];

  return (
    <TouchableOpacity
      style={[styles.container, step.isCompleted && styles.containerCompleted]}
      onPress={() => onPress?.(step)}
      activeOpacity={0.7}
    >
      <TouchableOpacity
        style={[styles.checkbox, step.isCompleted && styles.checkboxChecked]}
        onPress={() => onToggle(step.id)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        {step.isCompleted && (
          <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />
        )}
      </TouchableOpacity>

      <View style={styles.content}>
        <Text
          style={[styles.name, step.isCompleted && styles.nameCompleted]}
          numberOfLines={1}
        >
          {step.name}
        </Text>
        <Text style={styles.meta}>
          {step.product_name || category.label}
        </Text>
      </View>

      <View style={[styles.iconCircle, { backgroundColor: category.color + '18' }]}>
        <Ionicons
          name={category.icon as any}
          size={16}
          color={step.isCompleted ? colors.textLight : category.color}
        />
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  containerCompleted: {
    opacity: 0.55,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.surfaceSecondary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm + 4,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  content: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  name: {
    ...Typography.body,
    fontWeight: '500',
    color: colors.text,
  },
  nameCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textLight,
  },
  meta: {
    ...Typography.caption,
    marginTop: 2,
    color: colors.textLight,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

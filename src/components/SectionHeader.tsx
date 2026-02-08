import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface SectionHeaderProps {
  icon: string;
  title: string;
  subtitle?: string;
}

export function SectionHeader({ icon, title, subtitle }: SectionHeaderProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon as any} size={16} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm + 4,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  title: {
    ...Typography.subtitle,
    fontSize: 17,
    flex: 1,
    color: colors.text,
  },
  subtitle: {
    ...Typography.caption,
    fontSize: 12,
    color: colors.textLight,
  },
});

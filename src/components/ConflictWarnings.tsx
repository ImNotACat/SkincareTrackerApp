import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import type { DetectedConflict, ConflictSeverity } from '../lib/ingredient-conflicts';

const SEVERITY_CONFIG: Record<ConflictSeverity, { color: string; bg: string; icon: string; label: string }> = {
  high: { color: '#C47070', bg: '#C4707012', icon: 'alert-circle', label: 'Avoid' },
  medium: { color: '#D4A857', bg: '#D4A85712', icon: 'warning', label: 'Caution' },
  low: { color: '#7B9AAF', bg: '#7B9AAF12', icon: 'information-circle', label: 'Note' },
};

function ConflictCard({ conflict }: { conflict: DetectedConflict }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_CONFIG[conflict.rule.severity];

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: sev.color }]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Ionicons name={sev.icon as any} size={18} color={sev.color} />
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle}>{conflict.rule.title}</Text>
          <Text style={styles.cardProducts} numberOfLines={1}>
            {conflict.productA.name} + {conflict.productB.name}
          </Text>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: sev.bg }]}>
          <Text style={[styles.severityText, { color: sev.color }]}>{sev.label}</Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.cardBody}>
          <Text style={styles.explanation}>{conflict.rule.explanation}</Text>
          <View style={styles.suggestionRow}>
            <Ionicons name="bulb-outline" size={14} color={colors.primary} />
            <Text style={styles.suggestion}>{conflict.rule.suggestion}</Text>
          </View>
        </View>
      )}

      {!expanded && (
        <Text style={styles.tapHint}>Tap for details</Text>
      )}
    </TouchableOpacity>
  );
}

interface ConflictWarningsProps {
  conflicts: DetectedConflict[];
  maxVisible?: number;
  compact?: boolean;
}

export function ConflictWarnings({
  conflicts,
  maxVisible = 3,
  compact = false,
}: ConflictWarningsProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [showAll, setShowAll] = useState(false);

  if (conflicts.length === 0) return null;

  const visible = showAll ? conflicts : conflicts.slice(0, maxVisible);
  const remaining = conflicts.length - maxVisible;
  const highCount = conflicts.filter((c) => c.rule.severity === 'high').length;

  if (compact) {
    return (
      <View style={styles.compactWrap}>
        <View style={styles.compactRow}>
          <Ionicons
            name={highCount > 0 ? 'alert-circle' : 'warning'}
            size={16}
            color={highCount > 0 ? '#C47070' : '#D4A857'}
          />
          <Text style={styles.compactText}>
            {conflicts.length} ingredient conflict{conflicts.length !== 1 ? 's' : ''} detected
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="flask" size={16} color={colors.warning} />
        <Text style={styles.headerText}>
          Ingredient Conflicts ({conflicts.length})
        </Text>
      </View>

      {visible.map((conflict) => (
        <ConflictCard key={`${conflict.rule.id}-${conflict.productA.id}-${conflict.productB.id}`} conflict={conflict} />
      ))}

      {remaining > 0 && !showAll && (
        <TouchableOpacity style={styles.seeMore} onPress={() => setShowAll(true)} activeOpacity={0.7}>
          <Text style={styles.seeMoreText}>
            Show {remaining} more conflict{remaining !== 1 ? 's' : ''}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  headerText: {
    ...Typography.label,
    fontSize: 12,
    color: colors.warning,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    ...Typography.body,
    fontWeight: '600',
    fontSize: 14,
    color: colors.text,
  },
  cardProducts: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: 1,
    color: colors.textLight,
  },
  severityBadge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.pill,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardBody: {
    marginTop: Spacing.sm + 4,
    paddingTop: Spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  explanation: {
    ...Typography.bodySmall,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.sm + 2,
    gap: 6,
    backgroundColor: colors.primary + '0A',
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
  },
  suggestion: {
    ...Typography.bodySmall,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
    color: colors.text,
    fontWeight: '500',
  },
  tapHint: {
    ...Typography.caption,
    fontSize: 10,
    marginTop: Spacing.xs + 2,
    color: colors.textLight,
  },
  seeMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
  },
  seeMoreText: {
    ...Typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
  compactWrap: {
    marginTop: Spacing.sm,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C4707010',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm + 4,
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#C47070',
  },
  compactText: {
    ...Typography.bodySmall,
    fontSize: 12,
    fontWeight: '500',
    color: '#C47070',
  },
});

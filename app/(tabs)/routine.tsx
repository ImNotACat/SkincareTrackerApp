import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DragList, { DragListRenderItemInfo } from 'react-native-draglist';
import { Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRoutine } from '../../src/hooks/useRoutine';
import { useConfirm } from '../../src/contexts/ConfirmContext';
import { CATEGORY_INFO } from '../../src/constants/skincare';
import { SectionHeader } from '../../src/components/SectionHeader';
import { EmptyState } from '../../src/components/EmptyState';
import type { RoutineStep, TimeOfDay } from '../../src/types';

function getScheduleLabel(step: RoutineStep): string {
  const type = step.schedule_type || 'weekly';
  switch (type) {
    case 'weekly': {
      if ((step.days || []).length === 7) return 'Every day';
      return (step.days || []).map((d) => d.charAt(0).toUpperCase()).join(' ');
    }
    case 'cycle': {
      const len = step.cycle_length || 0;
      const active = step.cycle_days || [];
      return `${len}-day cycle · Day ${active.join(', ')}`;
    }
    case 'interval': {
      const interval = step.interval_days || 0;
      if (interval === 1) return 'Every day';
      if (interval === 2) return 'Every other day';
      return `Every ${interval} days`;
    }
    default:
      return '';
  }
}

export default function RoutineScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { steps, deleteStep, reorderSteps } = useRoutine();
  const { showConfirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<TimeOfDay>('morning');

  const filteredSteps = useMemo(
    () =>
      steps
        .filter((s) => s.time_of_day === activeTab || s.time_of_day === 'both')
        .sort((a, b) => a.order - b.order),
    [steps, activeTab],
  );

  const onReordered = useCallback(
    (fromIndex: number, toIndex: number) => {
      const copy = [...filteredSteps];
      const [removed] = copy.splice(fromIndex, 1);
      if (!removed) return;
      copy.splice(Math.min(toIndex, copy.length), 0, removed);
      const reorderedFiltered = copy.map((s, i) => ({ ...s, order: i }));
      const otherSteps = steps.filter((s) => s.time_of_day !== activeTab && s.time_of_day !== 'both');
      reorderSteps([...otherSteps, ...reorderedFiltered]);
    },
    [filteredSteps, steps, activeTab, reorderSteps],
  );

  const handleDelete = (step: RoutineStep) => {
    showConfirm({
      title: 'Delete Step',
      message: `Remove "${step.name}" from your routine?`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteStep(step.id) },
      ],
    });
  };

  const handleEdit = (step: RoutineStep) => {
    router.push({ pathname: '/edit-step', params: { stepId: step.id } });
  };

  function keyExtractor(item: RoutineStep) {
    return item.id;
  }

  function renderItem(info: DragListRenderItemInfo<RoutineStep>) {
    const { item, onDragStart, onDragEnd, isActive } = info;
    const category = CATEGORY_INFO[item.category];
    const scheduleLabel = getScheduleLabel(item);

    return (
      <View style={[styles.stepRow, isActive && styles.stepRowDragging]}>
        <TouchableOpacity
          onPressIn={onDragStart}
          onPressOut={onDragEnd}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.dragHandle}
          activeOpacity={1}
        >
          <Ionicons name="reorder-three-outline" size={22} color={colors.textLight} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.stepContentTouchable}
          onPress={() => handleEdit(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.categoryIcon, { backgroundColor: category.color + '18' }]}>
            <Ionicons name={category.icon as any} size={18} color={category.color} />
          </View>
          <View style={styles.stepInfo}>
            <Text style={styles.stepName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.stepMeta}>
              {category.label}  ·  {scheduleLabel}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.deleteButton}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={16} color={colors.textLight} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, activeTab === 'morning' && styles.toggleActive]}
          onPress={() => setActiveTab('morning')}
        >
          <Ionicons
            name="sunny-outline"
            size={16}
            color={activeTab === 'morning' ? colors.textOnPrimary : colors.textSecondary}
          />
          <Text
            style={[styles.toggleText, activeTab === 'morning' && styles.toggleTextActive]}
          >
            Morning
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, activeTab === 'evening' && styles.toggleActive]}
          onPress={() => setActiveTab('evening')}
        >
          <Ionicons
            name="moon-outline"
            size={16}
            color={activeTab === 'evening' ? colors.textOnPrimary : colors.textSecondary}
          />
          <Text
            style={[styles.toggleText, activeTab === 'evening' && styles.toggleTextActive]}
          >
            Evening
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.scrollView}>
        <SectionHeader
          icon={activeTab === 'morning' ? 'sunny-outline' : 'moon-outline'}
          title={`${activeTab === 'morning' ? 'Morning' : 'Evening'} Steps`}
          subtitle={`${filteredSteps.length} step${filteredSteps.length !== 1 ? 's' : ''} · Drag handle to reorder`}
        />

        {filteredSteps.length === 0 ? (
          <EmptyState
            icon="add-circle-outline"
            title="No steps yet"
            message={`Add steps to your ${activeTab} routine using the + button.`}
          />
        ) : (
          <DragList
            data={filteredSteps}
            keyExtractor={keyExtractor}
            onReordered={onReordered}
            renderItem={renderItem}
            contentContainerStyle={styles.scrollContent}
          />
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-step')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color={colors.textOnPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md + 4,
    marginTop: Spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: BorderRadius.pill,
    padding: 3,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.pill,
    gap: 6,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    ...Typography.button,
    fontSize: 13,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.textOnPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md + 4,
    paddingBottom: 80,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepContentTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  stepRowDragging: {
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderColor: colors.primary,
    opacity: 0.9,
  },
  dragHandle: {
    marginRight: Spacing.sm + 2,
    padding: Spacing.xs,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm + 4,
  },
  stepInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  stepName: {
    ...Typography.body,
    fontWeight: '500',
    color: colors.text,
  },
  stepMeta: {
    ...Typography.caption,
    marginTop: 2,
    color: colors.textLight,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
});

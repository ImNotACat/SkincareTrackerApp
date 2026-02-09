import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRoutine } from '../../src/hooks/useRoutine';
import { useProducts } from '../../src/hooks/useProducts';
import { ProgressRing } from '../../src/components/ProgressRing';
import { EmptyState } from '../../src/components/EmptyState';
import { ConflictWarnings } from '../../src/components/ConflictWarnings';
import { WeekBar } from '../../src/components/WeekBar';
import { CATEGORY_INFO } from '../../src/constants/skincare';
import { formatDateWithWeekday, getTodayString } from '../../src/lib/dateUtils';
import type { TimeOfDay, TodayStep } from '../../src/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getTimeLabel(t: TimeOfDay): string {
  return t === 'morning' ? 'Morning' : 'Evening';
}

function getTimeIcon(t: TimeOfDay): string {
  return t === 'morning' ? 'sunny-outline' : 'moon-outline';
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const router = useRouter();
  const {
    getTodaySteps,
    toggleStepCompletion,
    skipStep,
    finishRoutine,
    isLoading,
    reload,
  } = useRoutine();
  const { allConflicts, getProductsForDate } = useProducts();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const isMorningTime = useMemo(() => new Date().getHours() < 13, []);
  const [showMorning, setShowMorning] = useState(isMorningTime);
  const [showEvening, setShowEvening] = useState(!isMorningTime);
  const [selectedDate, setSelectedDate] = useState(getTodayString());

  const morningSteps = useMemo(() => getTodaySteps('morning', selectedDate), [getTodaySteps, selectedDate]);
  const eveningSteps = useMemo(() => getTodaySteps('evening', selectedDate), [getTodaySteps, selectedDate]);
  const todaysProducts = useMemo(() => getProductsForDate(selectedDate), [getProductsForDate, selectedDate]);

  const hasAnySteps = morningSteps.length > 0 || eveningSteps.length > 0;

  const handleFinishRoutine = async (timeOfDay: TimeOfDay) => {
    const stepsForTime = timeOfDay === 'morning' ? morningSteps : eveningSteps;
    const unactioned = stepsForTime.filter((s) => !s.isCompleted && !s.isSkipped);

    if (unactioned.length === 0) return;

    Alert.alert(
      'Finish Routine',
      `${unactioned.length} step${unactioned.length !== 1 ? 's' : ''} not yet actioned. Mark them as skipped and finish?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: () => finishRoutine(timeOfDay),
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={reload} tintColor={colors.primary} />
      }
    >
      {/* ── Week Bar (full-width) ──────────────────────────────── */}
      <WeekBar selectedDate={selectedDate} onDateSelect={setSelectedDate} />

      {/* ── Padded content ─────────────────────────────────────── */}
      <View style={styles.content}>

      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.date}>{formatDateWithWeekday(selectedDate)}</Text>
        <Text style={styles.greeting}>{getGreeting()}</Text>
      </View>

      {!hasAnySteps ? (
        <EmptyState
          icon="leaf-outline"
          title="No steps for today"
          message="Add steps to your routine to see them here."
        />
      ) : (
        <>
          {/* ── Morning Routine ────────────────────────────── */}
          {morningSteps.length > 0 && (
            <RoutineSection
              timeOfDay="morning"
              steps={morningSteps}
              isOpen={showMorning}
              onToggleOpen={() => setShowMorning(!showMorning)}
              onToggleStep={toggleStepCompletion}
              onSkipStep={skipStep}
              onFinish={() => handleFinishRoutine('morning')}
            />
          )}

          {/* ── Ingredient Conflict Warnings ────────────── */}
          {allConflicts.length > 0 && (
            <ConflictWarnings conflicts={allConflicts} maxVisible={2} />
          )}

          {/* ── Evening Routine ────────────────────────────── */}
          {eveningSteps.length > 0 && (
            <RoutineSection
              timeOfDay="evening"
              steps={eveningSteps}
              isOpen={showEvening}
              onToggleOpen={() => setShowEvening(!showEvening)}
              onToggleStep={toggleStepCompletion}
              onSkipStep={skipStep}
              onFinish={() => handleFinishRoutine('evening')}
            />
          )}

          {/* ── Today's Products ─────────────────────────────────── */}
          {todaysProducts.length > 0 && (
            <View style={styles.productsSection}>
              <View style={styles.productsSectionHeader}>
                <Ionicons name="bag-outline" size={16} color={colors.primary} />
                <Text style={styles.productsSectionTitle}>
                  Today's Products ({todaysProducts.length})
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.productsScroll}
              >
                {todaysProducts.map((product) => {
                  const category = CATEGORY_INFO[product.step_category];
                  return (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.productChip}
                      onPress={() => router.push({ pathname: '/product-detail', params: { productId: product.id } })}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.productChipIcon, { backgroundColor: category.color + '18' }]}>
                        <Ionicons name={category.icon as any} size={14} color={category.color} />
                      </View>
                      <View style={styles.productChipText}>
                        <Text style={styles.productChipName} numberOfLines={1}>{product.name}</Text>
                        {product.brand ? (
                          <Text style={styles.productChipBrand} numberOfLines={1}>{product.brand}</Text>
                        ) : null}
                      </View>
                      <View style={styles.productChipTimeBadge}>
                        <Ionicons
                          name={product.time_of_day === 'morning' ? 'sunny-outline' : product.time_of_day === 'evening' ? 'moon-outline' : 'time-outline'}
                          size={10}
                          color={colors.textLight}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── Action Cards ───────────────────────────────────── */}
          <View style={styles.actionCardsRow}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push({ pathname: '/(tabs)/products', params: { tab: 'explore' } })}
              activeOpacity={0.7}
            >
              <View style={[styles.actionCardIcon, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name="search" size={24} color={colors.accent} />
              </View>
              <Text style={styles.actionCardTitle}>Explore</Text>
              <Text style={styles.actionCardSubtitle}>Discover products</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/journal')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionCardIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="stats-chart" size={24} color={colors.primary} />
              </View>
              <Text style={styles.actionCardTitle}>Track Progress</Text>
              <Text style={styles.actionCardSubtitle}>View your journey</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <View style={styles.bottomSpacer} />
      </View>
    </ScrollView>
  );
}

// ─── Routine Section (collapsible) ───────────────────────────────────────────

function RoutineSection({
  timeOfDay,
  steps,
  isOpen,
  onToggleOpen,
  onToggleStep,
  onSkipStep,
  onFinish,
}: {
  timeOfDay: TimeOfDay;
  steps: TodayStep[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onToggleStep: (id: string, productUsed?: string) => void;
  onSkipStep: (id: string) => void;
  onFinish: () => void;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const completed = steps.filter((s) => s.isCompleted).length;
  const skipped = steps.filter((s) => s.isSkipped).length;
  const actioned = completed + skipped;
  const total = steps.length;
  const allDone = actioned === total && total > 0;
  const hasUnactioned = actioned < total && total > 0;

  const iconColor = timeOfDay === 'morning' ? '#D4B85A' : '#8B7BAF';

  // Celebration animation
  const celebrationScale = useRef(new Animated.Value(0)).current;
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const wasAllDone = useRef(false);
  const particleAnims = useRef(
    Array.from({ length: 8 }, () => ({
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (allDone && !wasAllDone.current) {
      // Trigger celebration animation
      celebrationScale.setValue(0);
      celebrationOpacity.setValue(1);

      Animated.sequence([
        Animated.spring(celebrationScale, {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(celebrationOpacity, {
          toValue: 0,
          duration: 1200,
          delay: 800,
          useNativeDriver: true,
        }),
      ]).start();

      // Particle burst
      particleAnims.forEach((p, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 50 + Math.random() * 30;
        p.translateX.setValue(0);
        p.translateY.setValue(0);
        p.opacity.setValue(1);
        Animated.parallel([
          Animated.timing(p.translateX, {
            toValue: Math.cos(angle) * dist,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(p.translateY, {
            toValue: Math.sin(angle) * dist,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: 600,
            delay: 200,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
    wasAllDone.current = allDone;
  }, [allDone]);

  function getSubtitle(): string {
    if (allDone) {
      if (skipped > 0) return `Done! ${completed} completed, ${skipped} skipped`;
      return 'All done — great job!';
    }
    const remaining = total - actioned;
    return `${remaining} step${remaining !== 1 ? 's' : ''} to go`;
  }

  return (
    <View style={styles.routineSection}>
      {/* Collapsible header */}
      <TouchableOpacity
        style={styles.routineHeader}
        onPress={onToggleOpen}
        activeOpacity={0.7}
      >
        <View style={styles.routineHeaderLeft}>
          <View style={[styles.timeIconCircle, allDone && styles.timeIconCircleDone]}>
            <Ionicons
              name={(allDone ? 'checkmark-done' : getTimeIcon(timeOfDay)) as any}
              size={20}
              color={colors.textOnPrimary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.routineTitle}>{getTimeLabel(timeOfDay)} Routine</Text>
            <Text style={styles.routineSubtitle}>{getSubtitle()}</Text>
          </View>
        </View>
        <View style={styles.routineHeaderRight}>
          <ProgressRing completed={completed} total={total} size={48} />
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textLight}
          />
        </View>
      </TouchableOpacity>

      {/* Expanded content */}
      {isOpen && (
        <View style={styles.routineBody}>
          <View style={styles.primaryDivider} />

          {/* Steps list */}
          <View style={styles.primarySteps}>
            {steps.map((step, index) => (
              <PrimaryStepRow
                key={step.id}
                step={step}
                onToggle={onToggleStep}
                onSkip={onSkipStep}
                isLast={index === steps.length - 1}
              />
            ))}
          </View>

          {/* Finish Routine button */}
          {hasUnactioned && (
            <>
              <View style={styles.primaryDivider} />
              <TouchableOpacity
                style={styles.finishBtn}
                onPress={onFinish}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-done-outline" size={18} color={colors.primary} />
                <Text style={styles.finishBtnText}>Finish Routine</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Completion summary with celebration */}
          {allDone && (
            <>
              <View style={styles.primaryDivider} />
              <View style={styles.celebrationWrapper}>
                {/* Particle burst */}
                {particleAnims.map((p, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.particle,
                      {
                        backgroundColor: i % 2 === 0 ? colors.primary : colors.accent,
                        opacity: p.opacity,
                        transform: [
                          { translateX: p.translateX },
                          { translateY: p.translateY },
                        ],
                      },
                    ]}
                  />
                ))}
                {/* Checkmark bounce */}
                <Animated.View
                  style={[
                    styles.celebrationCheck,
                    {
                      backgroundColor: colors.primary,
                      opacity: celebrationOpacity,
                      transform: [{ scale: celebrationScale }],
                    },
                  ]}
                >
                  <Ionicons name="checkmark-done" size={28} color={colors.textOnPrimary} />
                </Animated.View>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <View style={[styles.summaryDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.summaryText}>{completed} completed</Text>
                </View>
                {skipped > 0 && (
                  <View style={styles.summaryItem}>
                    <View style={[styles.summaryDot, { backgroundColor: colors.textLight }]} />
                    <Text style={styles.summaryText}>{skipped} skipped</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Primary Step Row ───────────────────────────────────────────────────────

function PrimaryStepRow({
  step,
  onToggle,
  onSkip,
  isLast,
}: {
  step: TodayStep;
  onToggle: (id: string, productUsed?: string) => void;
  onSkip: (id: string) => void;
  isLast: boolean;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const category = CATEGORY_INFO[step.category];
  const isActioned = step.isCompleted || step.isSkipped;

  return (
    <View style={[styles.pStepRow, !isLast && styles.pStepRowBorder]}>
      {/* Checkbox — tap to complete */}
      <TouchableOpacity
        style={[
          styles.pCheck,
          step.isCompleted && styles.pCheckDone,
          step.isSkipped && styles.pCheckSkipped,
        ]}
        onPress={() => onToggle(step.id, step.product_name)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {step.isCompleted && (
          <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />
        )}
        {step.isSkipped && (
          <Ionicons name="remove" size={14} color={colors.textLight} />
        )}
        {!isActioned && <View style={styles.pCheckInner} />}
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.pStepContent}>
        <Text
          style={[
            styles.pStepName,
            step.isCompleted && styles.pStepNameDone,
            step.isSkipped && styles.pStepNameSkipped,
          ]}
          numberOfLines={1}
        >
          {step.name}
        </Text>
        <Text style={styles.pStepMeta}>
          {step.isSkipped
            ? 'Skipped'
            : step.isCompleted && step.productUsed
              ? `Used: ${step.productUsed}`
              : step.product_name || category?.label || ''}
        </Text>
      </View>

      {/* Skip button (only when not yet actioned) */}
      {!isActioned && (
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => onSkip(step.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.skipBtnText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Category dot */}
      <View
        style={[
          styles.pCategoryDot,
          {
            backgroundColor: isActioned
              ? colors.textLight
              : category?.color || colors.textLight,
          },
        ]}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: Spacing.md + 4,
  },

  // Header
  header: {
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  date: {
    ...Typography.caption,
    color: colors.textLight,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  greeting: {
    ...Typography.title,
    color: colors.text,
    fontSize: 30,
  },

  // ── Routine section (collapsible) ───────────────────
  routineSection: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md + 4,
  },
  routineHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm + 4,
  },
  routineHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  routineTitle: {
    ...Typography.subtitle,
    color: colors.text,
    fontSize: 18,
  },
  routineSubtitle: {
    ...Typography.caption,
    color: colors.textLight,
    marginTop: 2,
    fontSize: 12,
  },
  routineBody: {},
  timeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeIconCircleDone: {
    backgroundColor: colors.success,
  },
  primaryDivider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  primaryEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  primaryEmptyText: {
    ...Typography.bodySmall,
    color: colors.textSecondary,
  },
  primarySteps: {
    paddingHorizontal: Spacing.sm,
  },

  // Primary step row
  pStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 6,
    paddingHorizontal: Spacing.sm + 4,
  },
  pStepRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  pCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm + 4,
  },
  pCheckDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pCheckSkipped: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.textLight,
  },
  pCheckInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  pStepContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  pStepName: {
    ...Typography.body,
    color: colors.text,
    fontWeight: '500',
    fontSize: 15,
  },
  pStepNameDone: {
    textDecorationLine: 'line-through',
    color: colors.textLight,
  },
  pStepNameSkipped: {
    color: colors.textLight,
    fontStyle: 'italic',
  },
  pStepMeta: {
    ...Typography.caption,
    color: colors.textLight,
    marginTop: 1,
    fontSize: 11,
  },
  skipBtn: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: Spacing.sm,
  },
  skipBtnText: {
    ...Typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  pCategoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Finish routine button
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm + 4,
  },
  finishBtnText: {
    ...Typography.button,
    fontSize: 14,
    color: colors.primary,
  },

  // Completion summary
  celebrationWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    position: 'relative',
  },
  celebrationCheck: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryText: {
    ...Typography.caption,
    color: colors.textLight,
    fontSize: 11,
  },

  // Today's Products
  productsSection: {
    marginTop: Spacing.lg,
  },
  productsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  productsSectionTitle: {
    ...Typography.label,
    fontSize: 12,
    color: colors.primary,
  },
  productsScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  productChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2,
    paddingRight: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: Spacing.sm,
    minWidth: 160,
    maxWidth: 220,
  },
  productChipIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productChipText: {
    flex: 1,
  },
  productChipName: {
    ...Typography.body,
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  productChipBrand: {
    ...Typography.caption,
    color: colors.textLight,
    fontSize: 10,
    marginTop: 1,
  },
  productChipTimeBadge: {
    marginLeft: 2,
  },

  // Action cards
  actionCardsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  actionCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  actionCardTitle: {
    ...Typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionCardSubtitle: {
    ...Typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },

  // Bottom
  bottomSpacer: {
    height: Spacing.xxl,
  },
});

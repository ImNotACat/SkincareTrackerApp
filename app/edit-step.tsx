import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useRoutine } from '../src/hooks/useRoutine';
import {
  CATEGORIES,
  CATEGORY_INFO,
  DAYS_OF_WEEK,
  ALL_DAYS,
  TIME_OF_DAY_OPTIONS,
  SCHEDULE_TYPE_OPTIONS,
} from '../src/constants/skincare';
import { useToast } from '../src/components/Toast';
import type { StepCategory, DayOfWeek, TimeOfDay, ScheduleType } from '../src/types';

export default function EditStepScreen() {
  const router = useRouter();
  const { stepId } = useLocalSearchParams<{ stepId: string }>();
  const { steps, updateStep } = useRoutine();
  const step = steps.find((s) => s.id === stepId);
  const { colors } = useTheme();
  const { showToast } = useToast();
  const styles = createStyles(colors);

  const [name, setName] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<StepCategory>('cleanser');
  const [timeOfDaySelection, setTimeOfDaySelection] = useState<('morning' | 'evening')[]>(['morning']);
  const [notes, setNotes] = useState('');

  // Schedule state
  const [scheduleType, setScheduleType] = useState<ScheduleType>('weekly');
  const [days, setDays] = useState<DayOfWeek[]>([]);
  const [cycleLength, setCycleLength] = useState('4');
  const [cycleDays, setCycleDays] = useState<number[]>([1]);
  const [cycleStartDate, setCycleStartDate] = useState('');
  const [intervalDays, setIntervalDays] = useState('3');
  const [intervalStartDate, setIntervalStartDate] = useState('');

  useEffect(() => {
    if (step) {
      setName(step.name);
      setProductName(step.product_name || '');
      setCategory(step.category);
      setTimeOfDaySelection(step.time_of_day === 'both' ? ['morning', 'evening'] : [step.time_of_day]);
      setNotes(step.notes || '');
      setScheduleType(step.schedule_type || 'weekly');
      setDays(step.days || []);
      setCycleLength(String(step.cycle_length || 4));
      setCycleDays(step.cycle_days || [1]);
      setCycleStartDate(step.cycle_start_date || new Date().toISOString().split('T')[0]);
      setIntervalDays(String(step.interval_days || 3));
      setIntervalStartDate(step.interval_start_date || new Date().toISOString().split('T')[0]);
    }
  }, [step]);

  const toggleDay = (day: DayOfWeek) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const toggleCycleDay = (day: number) => {
    setCycleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  };

  const handleCycleLengthChange = (val: string) => {
    setCycleLength(val);
    const num = parseInt(val, 10);
    if (num > 0) {
      setCycleDays((prev) => prev.filter((d) => d <= num));
    }
  };

  const validate = (): boolean => {
    if (!name.trim()) {
      showToast('Missing Name', { message: 'Please enter a name for this step.', variant: 'warning' });
      return false;
    }
    if (timeOfDaySelection.length === 0) {
      showToast('Time of day', { message: 'Select at least one: Morning or Evening.', variant: 'warning' });
      return false;
    }
    if (scheduleType === 'weekly' && days.length === 0) {
      showToast('No Days Selected', { message: 'Please select at least one day.', variant: 'warning' });
      return false;
    }
    if (scheduleType === 'cycle') {
      const len = parseInt(cycleLength, 10);
      if (!len || len < 2) {
        showToast('Invalid Cycle', { message: 'Cycle length must be at least 2 days.', variant: 'warning' });
        return false;
      }
      if (cycleDays.length === 0) {
        showToast('No Days Selected', { message: 'Please select at least one day in the cycle.', variant: 'warning' });
        return false;
      }
    }
    if (scheduleType === 'interval') {
      const interval = parseInt(intervalDays, 10);
      if (!interval || interval < 1) {
        showToast('Invalid Interval', { message: 'Interval must be at least 1 day.', variant: 'warning' });
        return false;
      }
    }
    return true;
  };

  const resolvedTimeOfDay: TimeOfDay =
    timeOfDaySelection.length === 2 ? 'both' : timeOfDaySelection[0];

  const handleSave = async () => {
    if (!stepId || !validate()) return;

    await updateStep(stepId, {
      name: name.trim(),
      product_id: step?.product_id,
      product_name: productName.trim() || undefined,
      category,
      time_of_day: resolvedTimeOfDay,
      notes: notes.trim() || undefined,
      schedule_type: scheduleType,
      days: scheduleType === 'weekly' ? days : [],
      cycle_length: scheduleType === 'cycle' ? parseInt(cycleLength, 10) : undefined,
      cycle_days: scheduleType === 'cycle' ? cycleDays : undefined,
      cycle_start_date: scheduleType === 'cycle' ? cycleStartDate : undefined,
      interval_days: scheduleType === 'interval' ? parseInt(intervalDays, 10) : undefined,
      interval_start_date: scheduleType === 'interval' ? intervalStartDate : undefined,
    });

    router.back();
  };

  if (!step) {
    return (
      <View style={styles.notFound}>
        <Text style={[Typography.body, { color: colors.text }]}>Step not found</Text>
      </View>
    );
  }

  const parsedCycleLength = parseInt(cycleLength, 10) || 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>STEP NAME</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g., Vitamin C Serum"
        placeholderTextColor={colors.textLight}
      />

      <Text style={styles.label}>PRODUCT NAME (OPTIONAL)</Text>
      <TextInput
        style={styles.input}
        value={productName}
        onChangeText={setProductName}
        placeholder="e.g., The Ordinary Vitamin C 23%"
        placeholderTextColor={colors.textLight}
      />

      <Text style={styles.label}>TIME OF DAY (select at least one)</Text>
      <View style={styles.pillRow}>
        {TIME_OF_DAY_OPTIONS.map((option) => {
          const selected = timeOfDaySelection.includes(option.key);
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.pill, selected && styles.pillSelected]}
              onPress={() => {
                if (selected && timeOfDaySelection.length <= 1) return;
                setTimeOfDaySelection((prev) =>
                  selected ? prev.filter((k) => k !== option.key) : [...prev, option.key].sort(),
                );
              }}
            >
              <Ionicons
                name={option.icon as any}
                size={16}
                color={selected ? colors.textOnPrimary : colors.textSecondary}
              />
              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>CATEGORY</Text>
      <View style={styles.chipGrid}>
        {CATEGORIES.map((cat) => {
          const info = CATEGORY_INFO[cat];
          const selected = category === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setCategory(cat)}
            >
              <Ionicons
                name={info.icon as any}
                size={14}
                color={selected ? colors.textOnPrimary : colors.textSecondary}
              />
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {info.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Schedule Type ──────────────────────────────────────────── */}
      <Text style={styles.label}>SCHEDULE</Text>
      <View style={styles.scheduleTypeRow}>
        {SCHEDULE_TYPE_OPTIONS.map((option) => {
          const selected = scheduleType === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.scheduleTypeBtn, selected && styles.scheduleTypeBtnSelected]}
              onPress={() => setScheduleType(option.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={option.icon as any}
                size={16}
                color={selected ? colors.textOnPrimary : colors.textSecondary}
              />
              <Text style={[styles.scheduleTypeText, selected && styles.scheduleTypeTextSelected]}>
                {option.label}
              </Text>
              <Text style={[styles.scheduleTypeDesc, selected && styles.scheduleTypeDescSelected]}>
                {option.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Weekly: Day picker ─────────────────────────────────────── */}
      {scheduleType === 'weekly' && (
        <>
          <Text style={styles.label}>DAYS OF THE WEEK</Text>
          <View style={styles.daysRow}>
            {DAYS_OF_WEEK.map((day) => {
              const selected = days.includes(day.key);
              return (
                <TouchableOpacity
                  key={day.key}
                  style={[styles.dayCircle, selected && styles.dayCircleSelected]}
                  onPress={() => toggleDay(day.key)}
                >
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>
                    {day.short}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={styles.selectAll}
            onPress={() => setDays(days.length === ALL_DAYS.length ? [] : [...ALL_DAYS])}
          >
            <Text style={styles.selectAllText}>
              {days.length === ALL_DAYS.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── Cycle: length + day picker ─────────────────────────────── */}
      {scheduleType === 'cycle' && (
        <>
          <Text style={styles.label}>CYCLE LENGTH (DAYS)</Text>
          <TextInput
            style={styles.input}
            value={cycleLength}
            onChangeText={handleCycleLengthChange}
            placeholder="e.g., 4"
            placeholderTextColor={colors.textLight}
            keyboardType="number-pad"
          />

          {parsedCycleLength >= 2 && (
            <>
              <Text style={styles.label}>ACTIVE ON WHICH DAYS?</Text>
              <View style={styles.cycleDaysRow}>
                {Array.from({ length: parsedCycleLength }, (_, i) => i + 1).map((day) => {
                  const selected = cycleDays.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.cycleDayBtn, selected && styles.cycleDayBtnSelected]}
                      onPress={() => toggleCycleDay(day)}
                    >
                      <Text style={[styles.cycleDayNum, selected && styles.cycleDayNumSelected]}>
                        {day}
                      </Text>
                      <Text style={[styles.cycleDayLabel, selected && styles.cycleDayLabelSelected]}>
                        Day {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>CYCLE START DATE</Text>
              <TextInput
                style={styles.input}
                value={cycleStartDate}
                onChangeText={setCycleStartDate}
                placeholder="dd-mm-yyyy"
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.scheduleHint}>
                Day 1 of this cycle started on this date. The cycle repeats every {parsedCycleLength} days.
              </Text>
            </>
          )}
        </>
      )}

      {/* ── Interval: every X days ─────────────────────────────────── */}
      {scheduleType === 'interval' && (
        <>
          <Text style={styles.label}>REPEAT EVERY</Text>
          <View style={styles.intervalRow}>
            <TextInput
              style={[styles.input, styles.intervalInput]}
              value={intervalDays}
              onChangeText={setIntervalDays}
              placeholder="3"
              placeholderTextColor={colors.textLight}
              keyboardType="number-pad"
            />
            <Text style={styles.intervalUnit}>days</Text>
          </View>

          <Text style={styles.label}>FIRST OCCURRENCE</Text>
          <TextInput
            style={styles.input}
            value={intervalStartDate}
            onChangeText={setIntervalStartDate}
            placeholder="dd-mm-yyyy"
            placeholderTextColor={colors.textLight}
          />
          <Text style={styles.scheduleHint}>
            First occurrence on this date, then every {parseInt(intervalDays, 10) || '…'} days after that.
          </Text>
        </>
      )}

      <Text style={styles.label}>NOTES (OPTIONAL)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Any notes about this step..."
        placeholderTextColor={colors.textLight}
        multiline={true}
        numberOfLines={3}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: Spacing.md + 4 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  label: {
    ...Typography.label,
    color: colors.textSecondary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  pillRow: { flexDirection: 'row', gap: Spacing.sm },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 3,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 6,
  },
  pillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { ...Typography.button, fontSize: 13, color: colors.textSecondary },
  pillTextSelected: { color: colors.textOnPrimary },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm + 4,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 5,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...Typography.caption, color: colors.textSecondary, fontSize: 12 },
  chipTextSelected: { color: colors.textOnPrimary },

  // Schedule type selector
  scheduleTypeRow: { flexDirection: 'row', gap: Spacing.sm },
  scheduleTypeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 4,
  },
  scheduleTypeBtnSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  scheduleTypeText: { ...Typography.button, fontSize: 13, color: colors.textSecondary },
  scheduleTypeTextSelected: { color: colors.textOnPrimary },
  scheduleTypeDesc: { ...Typography.caption, fontSize: 10, color: colors.textLight, textAlign: 'center' },
  scheduleTypeDescSelected: { color: colors.primaryLight },

  // Weekly days
  daysRow: { flexDirection: 'row', gap: Spacing.sm },
  dayCircle: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dayCircleSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { ...Typography.button, fontSize: 12, color: colors.textSecondary },
  dayTextSelected: { color: colors.textOnPrimary },
  selectAll: { alignSelf: 'flex-end', marginTop: Spacing.xs, paddingVertical: 4 },
  selectAllText: { ...Typography.caption, color: colors.primary, fontWeight: '600' },

  // Cycle days
  cycleDaysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cycleDayBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 60,
    gap: 2,
  },
  cycleDayBtnSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  cycleDayNum: { ...Typography.subtitle, fontSize: 16, color: colors.textSecondary },
  cycleDayNumSelected: { color: colors.textOnPrimary },
  cycleDayLabel: { ...Typography.caption, fontSize: 10, color: colors.textLight },
  cycleDayLabelSelected: { color: colors.primaryLight },

  // Interval
  intervalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  intervalInput: { flex: 0, width: 80, textAlign: 'center' },
  intervalUnit: { ...Typography.body, fontWeight: '500', color: colors.textSecondary },

  // Schedule hint
  scheduleHint: {
    ...Typography.caption,
    fontSize: 11,
    color: colors.textLight,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },

  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xl,
  },
  saveButtonText: { ...Typography.button, color: colors.textOnPrimary },
});

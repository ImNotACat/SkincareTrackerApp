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
import { Colors, Typography, Spacing, BorderRadius } from '../src/constants/theme';
import { useRoutine } from '../src/hooks/useRoutine';
import {
  CATEGORIES,
  CATEGORY_INFO,
  DAYS_OF_WEEK,
  ALL_DAYS,
  TIME_OF_DAY_OPTIONS,
  SCHEDULE_TYPE_OPTIONS,
} from '../src/constants/skincare';
import type { StepCategory, DayOfWeek, TimeOfDay, ScheduleType } from '../src/types';

export default function EditStepScreen() {
  const router = useRouter();
  const { stepId } = useLocalSearchParams<{ stepId: string }>();
  const { steps, updateStep } = useRoutine();
  const step = steps.find((s) => s.id === stepId);

  const [name, setName] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<StepCategory>('cleanser');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');
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
      setTimeOfDay(step.time_of_day);
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
      Alert.alert('Missing Name', 'Please enter a name for this step.');
      return false;
    }
    if (scheduleType === 'weekly' && days.length === 0) {
      Alert.alert('No Days Selected', 'Please select at least one day.');
      return false;
    }
    if (scheduleType === 'cycle') {
      const len = parseInt(cycleLength, 10);
      if (!len || len < 2) {
        Alert.alert('Invalid Cycle', 'Cycle length must be at least 2 days.');
        return false;
      }
      if (cycleDays.length === 0) {
        Alert.alert('No Days Selected', 'Please select at least one day in the cycle.');
        return false;
      }
    }
    if (scheduleType === 'interval') {
      const interval = parseInt(intervalDays, 10);
      if (!interval || interval < 1) {
        Alert.alert('Invalid Interval', 'Interval must be at least 1 day.');
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!stepId || !validate()) return;

    await updateStep(stepId, {
      name: name.trim(),
      product_name: productName.trim() || undefined,
      category,
      time_of_day: timeOfDay,
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
        <Text style={Typography.body}>Step not found</Text>
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
        placeholderTextColor={Colors.textLight}
      />

      <Text style={styles.label}>PRODUCT NAME (OPTIONAL)</Text>
      <TextInput
        style={styles.input}
        value={productName}
        onChangeText={setProductName}
        placeholder="e.g., The Ordinary Vitamin C 23%"
        placeholderTextColor={Colors.textLight}
      />

      <Text style={styles.label}>TIME OF DAY</Text>
      <View style={styles.pillRow}>
        {TIME_OF_DAY_OPTIONS.map((option) => {
          const selected = timeOfDay === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.pill, selected && styles.pillSelected]}
              onPress={() => setTimeOfDay(option.key)}
            >
              <Ionicons
                name={option.icon as any}
                size={16}
                color={selected ? Colors.textOnPrimary : Colors.textSecondary}
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
                color={selected ? Colors.textOnPrimary : Colors.textSecondary}
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
                color={selected ? Colors.textOnPrimary : Colors.textSecondary}
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
            placeholderTextColor={Colors.textLight}
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
                placeholderTextColor={Colors.textLight}
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
              placeholderTextColor={Colors.textLight}
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
            placeholderTextColor={Colors.textLight}
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
        placeholderTextColor={Colors.textLight}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md + 4 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  label: {
    ...Typography.label,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.body,
    borderWidth: 1,
    borderColor: Colors.border,
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
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 6,
  },
  pillSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { ...Typography.button, fontSize: 13, color: Colors.textSecondary },
  pillTextSelected: { color: Colors.textOnPrimary },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm + 4,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 5,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { ...Typography.caption, color: Colors.textSecondary, fontSize: 12 },
  chipTextSelected: { color: Colors.textOnPrimary },

  // Schedule type selector
  scheduleTypeRow: { flexDirection: 'row', gap: Spacing.sm },
  scheduleTypeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 4,
  },
  scheduleTypeBtnSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  scheduleTypeText: { ...Typography.button, fontSize: 13, color: Colors.textSecondary },
  scheduleTypeTextSelected: { color: Colors.textOnPrimary },
  scheduleTypeDesc: { ...Typography.caption, fontSize: 10, color: Colors.textLight, textAlign: 'center' },
  scheduleTypeDescSelected: { color: Colors.primaryLight },

  // Weekly days
  daysRow: { flexDirection: 'row', gap: Spacing.sm },
  dayCircle: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  dayCircleSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayText: { ...Typography.button, fontSize: 12, color: Colors.textSecondary },
  dayTextSelected: { color: Colors.textOnPrimary },
  selectAll: { alignSelf: 'flex-end', marginTop: Spacing.xs, paddingVertical: 4 },
  selectAllText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

  // Cycle days
  cycleDaysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cycleDayBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    minWidth: 60,
    gap: 2,
  },
  cycleDayBtnSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  cycleDayNum: { ...Typography.subtitle, fontSize: 16, color: Colors.textSecondary },
  cycleDayNumSelected: { color: Colors.textOnPrimary },
  cycleDayLabel: { ...Typography.caption, fontSize: 10, color: Colors.textLight },
  cycleDayLabelSelected: { color: Colors.primaryLight },

  // Interval
  intervalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  intervalInput: { flex: 0, width: 80, textAlign: 'center' },
  intervalUnit: { ...Typography.body, fontWeight: '500', color: Colors.textSecondary },

  // Schedule hint
  scheduleHint: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textLight,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },

  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xl,
  },
  saveButtonText: { ...Typography.button, color: Colors.textOnPrimary },
});

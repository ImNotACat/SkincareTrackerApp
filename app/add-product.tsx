import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useProducts } from '../src/hooks/useProducts';
import { importProductFromUrl } from '../src/lib/product-import';
import {
  CATEGORIES,
  CATEGORY_INFO,
  TIME_OF_DAY_USAGE_OPTIONS,
  DAYS_OF_WEEK,
  ALL_DAYS,
  SCHEDULE_TYPE_OPTIONS,
} from '../src/constants/skincare';
import { getTodayString, formatDateForDisplay } from '../src/lib/dateUtils';
import { IngredientSelector } from '../src/components/IngredientSelector';
import type { StepCategory, TimeOfDayUsage, DayOfWeek, ScheduleType } from '../src/types';

type AddMode = 'manual' | 'import';

export default function AddProductScreen() {
  const router = useRouter();
  const { addProduct } = useProducts();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [mode, setMode] = useState<AddMode>('manual');
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Product fields
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [stepCategory, setStepCategory] = useState<StepCategory>('serum');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayUsage>('morning');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('weekly');
  const [scheduleDays, setScheduleDays] = useState<DayOfWeek[]>([...ALL_DAYS]);
  const [cycleLength, setCycleLength] = useState('4');
  const [cycleDays, setCycleDays] = useState<number[]>([1]);
  const [intervalDays, setIntervalDays] = useState('3');
  const [activeIngredients, setActiveIngredients] = useState<string[]>([]);
  const [fullIngredients, setFullIngredients] = useState('');
  const [longevityMonths, setLongevityMonths] = useState('');
  const [datePurchased, setDatePurchased] = useState('');
  const [dateOpened, setDateOpened] = useState('');
  const [notes, setNotes] = useState('');
  const [startedAt, setStartedAt] = useState(getTodayString());

  const todayStr = new Date().toISOString().split('T')[0];

  const toggleDay = (day: DayOfWeek) => {
    setScheduleDays((prev) =>
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

  const parsedCycleLength = parseInt(cycleLength, 10) || 0;

  const handleImport = async () => {
    if (!importUrl.trim()) {
      Alert.alert('No URL', 'Please paste a product URL first.');
      return;
    }

    setIsImporting(true);
    try {
      const data = await importProductFromUrl(importUrl.trim());

      if (data.name) setName(data.name);
      if (data.brand) setBrand(data.brand);
      if (data.image_url) setImageUrl(data.image_url);
      if (data.ingredients) setFullIngredients(data.ingredients);
      setSourceUrl(data.source_url);

      // Auto-switch to show the form so user can review/complete
      setMode('manual');

      Alert.alert(
        'Product Imported',
        `Found: ${data.name || 'product'}${data.brand ? ` by ${data.brand}` : ''}. Review and complete the details below.`,
      );
    } catch (error) {
      Alert.alert('Import Failed', 'Could not extract product info. Try adding it manually.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a product name.');
      return;
    }

    await addProduct({
      name: name.trim(),
      brand: brand.trim() || undefined,
      image_url: imageUrl.trim() || undefined,
      source_url: sourceUrl.trim() || undefined,
      step_category: stepCategory,
      time_of_day: timeOfDay,
      times_per_week: scheduleType === 'weekly' ? scheduleDays.length || 7 : scheduleType === 'interval' ? Math.round(7 / (parseInt(intervalDays, 10) || 1)) : 7,
      schedule_type: scheduleType,
      schedule_days: scheduleType === 'weekly' ? scheduleDays : undefined,
      schedule_cycle_length: scheduleType === 'cycle' ? parseInt(cycleLength, 10) : undefined,
      schedule_cycle_days: scheduleType === 'cycle' ? cycleDays : undefined,
      schedule_cycle_start_date: scheduleType === 'cycle' ? todayStr : undefined,
      schedule_interval_days: scheduleType === 'interval' ? parseInt(intervalDays, 10) : undefined,
      schedule_interval_start_date: scheduleType === 'interval' ? todayStr : undefined,
      active_ingredients: activeIngredients.length > 0 ? activeIngredients.join(', ') : undefined,
      full_ingredients: fullIngredients.trim() || undefined,
      longevity_months: longevityMonths ? parseInt(longevityMonths, 10) || undefined : undefined,
      date_purchased: datePurchased.trim() || undefined,
      date_opened: dateOpened.trim() || undefined,
      notes: notes.trim() || undefined,
      started_at: startedAt,
      stopped_at: undefined,
    });

    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'manual' && styles.modeButtonActive]}
          onPress={() => setMode('manual')}
        >
          <Ionicons
            name="create-outline"
            size={16}
            color={mode === 'manual' ? colors.textOnPrimary : colors.textSecondary}
          />
          <Text style={[styles.modeText, mode === 'manual' && styles.modeTextActive]}>
            Add Manually
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'import' && styles.modeButtonActive]}
          onPress={() => setMode('import')}
        >
          <Ionicons
            name="link-outline"
            size={16}
            color={mode === 'import' ? colors.textOnPrimary : colors.textSecondary}
          />
          <Text style={[styles.modeText, mode === 'import' && styles.modeTextActive]}>
            Import from URL
          </Text>
        </TouchableOpacity>
      </View>

      {/* Import section */}
      {mode === 'import' && (
        <View style={styles.importSection}>
          <Text style={styles.importHint}>
            Paste a link from any skincare brand site (The Ordinary, CeraVe, Sephora, etc.)
          </Text>
          <TextInput
            style={styles.input}
            value={importUrl}
            onChangeText={setImportUrl}
            placeholder="https://theordinary.com/en-us/product..."
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
            keyboardType="url"
          />
          <TouchableOpacity
            style={styles.importButton}
            onPress={handleImport}
            disabled={isImporting}
            activeOpacity={0.85}
          >
            {isImporting ? (
              <ActivityIndicator color={colors.textOnPrimary} size="small" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color={colors.textOnPrimary} />
                <Text style={styles.importButtonText}>Import Product</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Product photo preview */}
      {imageUrl ? (
        <View style={styles.imagePreview}>
          <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
          <TouchableOpacity style={styles.imageRemove} onPress={() => setImageUrl('')}>
            <Ionicons name="close" size={14} color={colors.textOnPrimary} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Core Fields ──────────────────────────────────────── */}

      <Text style={styles.label}>STEP CATEGORY</Text>
      <View style={styles.chipGrid}>
        {CATEGORIES.map((cat) => {
          const info = CATEGORY_INFO[cat];
          const selected = stepCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setStepCategory(cat)}
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

      <Text style={styles.label}>PRODUCT NAME</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g., Niacinamide 10% + Zinc 1%"
        placeholderTextColor={colors.textLight}
      />

      <Text style={styles.label}>BRAND</Text>
      <TextInput
        style={styles.input}
        value={brand}
        onChangeText={setBrand}
        placeholder="e.g., The Ordinary"
        placeholderTextColor={colors.textLight}
      />

      <Text style={styles.label}>PRODUCT IMAGE URL (OPTIONAL)</Text>
      <TextInput
        style={styles.input}
        value={imageUrl}
        onChangeText={setImageUrl}
        placeholder="https://..."
        placeholderTextColor={colors.textLight}
        autoCapitalize="none"
        keyboardType="url"
      />

      {/* ── Routine Placement ────────────────────────────────── */}

      <Text style={styles.sectionTitle}>Routine Placement</Text>

      <Text style={styles.label}>WHEN TO USE</Text>
      <View style={styles.pillRow}>
        {TIME_OF_DAY_USAGE_OPTIONS.map((option) => {
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
                color={selected ? colors.textOnPrimary : colors.textSecondary}
              />
              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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

      {scheduleType === 'weekly' && (
        <>
          <Text style={styles.label}>DAYS OF THE WEEK</Text>
          <View style={styles.daysRow}>
            {DAYS_OF_WEEK.map((day) => {
              const selected = scheduleDays.includes(day.key);
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
            onPress={() => setScheduleDays(scheduleDays.length === ALL_DAYS.length ? [] : [...ALL_DAYS])}
          >
            <Text style={styles.selectAllText}>
              {scheduleDays.length === ALL_DAYS.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </>
      )}

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
              <Text style={styles.scheduleHint}>
                Cycle starts today and repeats every {parsedCycleLength} days.
              </Text>
            </>
          )}
        </>
      )}

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
          <Text style={styles.scheduleHint}>
            First occurrence is today, then every {parseInt(intervalDays, 10) || '…'} days after that.
          </Text>
        </>
      )}

      {/* ── Ingredients ──────────────────────────────────────── */}

      <Text style={styles.sectionTitle}>Ingredients</Text>

      <Text style={styles.label}>ACTIVE / KEY INGREDIENTS</Text>
      <IngredientSelector
        selectedIngredients={activeIngredients}
        onSelectionChange={setActiveIngredients}
      />

      <Text style={styles.label}>FULL INGREDIENTS LIST (OPTIONAL)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={fullIngredients}
        onChangeText={setFullIngredients}
        placeholder="Aqua, Niacinamide, Pentylene Glycol..."
        placeholderTextColor={colors.textLight}
        multiline={true}
        numberOfLines={4}
      />

      {/* ── Longevity & Dates ────────────────────────────────── */}

      <Text style={styles.sectionTitle}>Longevity & Dates</Text>

      <Text style={styles.label}>PERIOD AFTER OPENING (MONTHS)</Text>
      <TextInput
        style={styles.input}
        value={longevityMonths}
        onChangeText={setLongevityMonths}
        placeholder="e.g., 6, 12, 24"
        placeholderTextColor={colors.textLight}
        keyboardType="number-pad"
      />
      <Text style={styles.hint}>Usually printed on the jar icon on packaging (e.g., 12M)</Text>

      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={styles.label}>DATE PURCHASED</Text>
          <TextInput
            style={styles.input}
            value={datePurchased ? formatDateForDisplay(datePurchased) : ''}
            onChangeText={(text) => {
              // Allow user to type dd-mm-yyyy, convert to YYYY-MM-DD for storage
              const parsed = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
              if (parsed) {
                const [, day, month, year] = parsed;
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) {
                  setDatePurchased(date.toISOString().split('T')[0]);
                }
              } else if (text === '') {
                setDatePurchased('');
              }
            }}
            placeholder="dd-mm-yyyy"
            placeholderTextColor={colors.textLight}
          />
        </View>
        <View style={styles.dateField}>
          <Text style={styles.label}>DATE OPENED</Text>
          <TextInput
            style={styles.input}
            value={dateOpened ? formatDateForDisplay(dateOpened) : ''}
            onChangeText={(text) => {
              const parsed = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
              if (parsed) {
                const [, day, month, year] = parsed;
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) {
                  setDateOpened(date.toISOString().split('T')[0]);
                }
              } else if (text === '') {
                setDateOpened('');
              }
            }}
            placeholder="dd-mm-yyyy"
            placeholderTextColor={colors.textLight}
          />
        </View>
      </View>

      <Text style={styles.label}>ADDED TO ROUTINE ON</Text>
      <TextInput
        style={styles.input}
        value={startedAt ? formatDateForDisplay(startedAt) : ''}
        onChangeText={(text) => {
          const parsed = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
          if (parsed) {
            const [, day, month, year] = parsed;
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            if (!isNaN(date.getTime())) {
              setStartedAt(date.toISOString().split('T')[0]);
            }
          } else if (text === '') {
            setStartedAt(getTodayString());
          }
        }}
        placeholder="dd-mm-yyyy"
        placeholderTextColor={colors.textLight}
      />

      {/* ── Notes ────────────────────────────────────────────── */}

      <Text style={styles.label}>USAGE NOTES (OPTIONAL)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g., Apply to dry skin, wait 20 min before next step..."
        placeholderTextColor={colors.textLight}
        multiline={true}
        numberOfLines={3}
      />

      {/* Save */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
        <Text style={styles.saveButtonText}>Add Product</Text>
      </TouchableOpacity>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: Spacing.md + 4 },

  // Mode toggle
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: BorderRadius.pill,
    padding: 3,
    marginBottom: Spacing.md,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 3,
    borderRadius: BorderRadius.pill,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeText: { ...Typography.button, fontSize: 13, color: colors.textSecondary },
  modeTextActive: { color: colors.textOnPrimary },

  // Import section
  importSection: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  importHint: {
    ...Typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.sm + 3,
    gap: Spacing.sm,
  },
  importButtonText: { ...Typography.button, fontSize: 14, color: colors.textOnPrimary },

  // Image preview
  imagePreview: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  productImage: {
    width: 160,
    height: 160,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  imageRemove: {
    position: 'absolute',
    top: 6,
    right: '50%',
    marginRight: -80 + 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text + '80',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section
  sectionTitle: {
    ...Typography.subtitle,
    color: colors.text,
    fontSize: 16,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xs,
  },

  // Form fields
  label: { ...Typography.label, color: colors.textSecondary, marginTop: Spacing.md, marginBottom: Spacing.sm },
  hint: { ...Typography.caption, marginTop: Spacing.xs, color: colors.textLight, fontSize: 11 },
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

  // Date row
  dateRow: { flexDirection: 'row', gap: Spacing.sm },
  dateField: { flex: 1 },

  // Pills & chips
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
  pillText: { ...Typography.button, fontSize: 12, color: colors.textSecondary },
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

  // Save
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

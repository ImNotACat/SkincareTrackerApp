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
import { Colors, Typography, Spacing, BorderRadius } from '../src/constants/theme';
import { useProducts } from '../src/hooks/useProducts';
import { importProductFromUrl } from '../src/lib/product-import';
import {
  CATEGORIES,
  CATEGORY_INFO,
  TIME_OF_DAY_USAGE_OPTIONS,
  FREQUENCY_OPTIONS,
} from '../src/constants/skincare';
import { getTodayString, formatDateForDisplay } from '../src/lib/dateUtils';
import { IngredientSelector } from '../src/components/IngredientSelector';
import type { StepCategory, TimeOfDayUsage } from '../src/types';

type AddMode = 'manual' | 'import';

export default function AddProductScreen() {
  const router = useRouter();
  const { addProduct } = useProducts();

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
  const [timesPerWeek, setTimesPerWeek] = useState(7);
  const [activeIngredients, setActiveIngredients] = useState<string[]>([]);
  const [fullIngredients, setFullIngredients] = useState('');
  const [longevityMonths, setLongevityMonths] = useState('');
  const [datePurchased, setDatePurchased] = useState('');
  const [dateOpened, setDateOpened] = useState('');
  const [notes, setNotes] = useState('');
  const [startedAt, setStartedAt] = useState(getTodayString());

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
      times_per_week: timesPerWeek,
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
            color={mode === 'manual' ? Colors.textOnPrimary : Colors.textSecondary}
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
            color={mode === 'import' ? Colors.textOnPrimary : Colors.textSecondary}
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
            placeholderTextColor={Colors.textLight}
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
              <ActivityIndicator color={Colors.textOnPrimary} size="small" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color={Colors.textOnPrimary} />
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
            <Ionicons name="close" size={14} color={Colors.textOnPrimary} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Core Fields ──────────────────────────────────────── */}

      <Text style={styles.label}>PRODUCT NAME</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g., Niacinamide 10% + Zinc 1%"
        placeholderTextColor={Colors.textLight}
      />

      <Text style={styles.label}>BRAND</Text>
      <TextInput
        style={styles.input}
        value={brand}
        onChangeText={setBrand}
        placeholder="e.g., The Ordinary"
        placeholderTextColor={Colors.textLight}
      />

      <Text style={styles.label}>PRODUCT IMAGE URL (OPTIONAL)</Text>
      <TextInput
        style={styles.input}
        value={imageUrl}
        onChangeText={setImageUrl}
        placeholder="https://..."
        placeholderTextColor={Colors.textLight}
        autoCapitalize="none"
        keyboardType="url"
      />

      {/* ── Routine Placement ────────────────────────────────── */}

      <Text style={styles.sectionTitle}>Routine Placement</Text>

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
                color={selected ? Colors.textOnPrimary : Colors.textSecondary}
              />
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {info.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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
                color={selected ? Colors.textOnPrimary : Colors.textSecondary}
              />
              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>HOW OFTEN?</Text>
      <View style={styles.freqRow}>
        {FREQUENCY_OPTIONS.map((opt) => {
          const selected = timesPerWeek === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.freqPill, selected && styles.freqPillSelected]}
              onPress={() => setTimesPerWeek(opt.value)}
            >
              <Text style={[styles.freqText, selected && styles.freqTextSelected]}>
                {opt.value === 7 ? 'Daily' : `${opt.value}x`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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
        placeholderTextColor={Colors.textLight}
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
        placeholderTextColor={Colors.textLight}
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
            placeholderTextColor={Colors.textLight}
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
            placeholderTextColor={Colors.textLight}
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
        placeholderTextColor={Colors.textLight}
      />

      {/* ── Notes ────────────────────────────────────────────── */}

      <Text style={styles.label}>USAGE NOTES (OPTIONAL)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g., Apply to dry skin, wait 20 min before next step..."
        placeholderTextColor={Colors.textLight}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md + 4 },

  // Mode toggle
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
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
    backgroundColor: Colors.primary,
  },
  modeText: { ...Typography.button, fontSize: 13, color: Colors.textSecondary },
  modeTextActive: { color: Colors.textOnPrimary },

  // Import section
  importSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  importHint: {
    ...Typography.bodySmall,
    lineHeight: 19,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.sm + 3,
    gap: Spacing.sm,
  },
  importButtonText: { ...Typography.button, fontSize: 14, color: Colors.textOnPrimary },

  // Image preview
  imagePreview: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  productImage: {
    width: 160,
    height: 160,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary,
  },
  imageRemove: {
    position: 'absolute',
    top: 6,
    right: '50%',
    marginRight: -80 + 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.text + '80',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section
  sectionTitle: {
    ...Typography.subtitle,
    fontSize: 16,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xs,
  },

  // Form fields
  label: { ...Typography.label, marginTop: Spacing.md, marginBottom: Spacing.sm },
  hint: { ...Typography.caption, marginTop: Spacing.xs, color: Colors.textLight, fontSize: 11 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.body,
    borderWidth: 1,
    borderColor: Colors.border,
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
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 6,
  },
  pillSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { ...Typography.button, fontSize: 12, color: Colors.textSecondary },
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

  freqRow: { flexDirection: 'row', gap: Spacing.sm },
  freqPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 3,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  freqPillSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  freqText: { ...Typography.button, fontSize: 12, color: Colors.textSecondary },
  freqTextSelected: { color: Colors.textOnPrimary },

  // Save
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

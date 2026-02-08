import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../src/constants/theme';
import { useProducts } from '../src/hooks/useProducts';
import {
  CATEGORIES,
  CATEGORY_INFO,
  TIME_OF_DAY_USAGE_OPTIONS,
  FREQUENCY_OPTIONS,
} from '../src/constants/skincare';
import { formatDateForDisplay } from '../src/lib/dateUtils';
import { IngredientSelector } from '../src/components/IngredientSelector';
import type { StepCategory, TimeOfDayUsage } from '../src/types';

export default function EditProductScreen() {
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { products, updateProduct, deleteProduct } = useProducts();
  const product = products.find((p) => p.id === productId);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [stepCategory, setStepCategory] = useState<StepCategory>('serum');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayUsage>('morning');
  const [timesPerWeek, setTimesPerWeek] = useState(7);
  const [activeIngredients, setActiveIngredients] = useState<string[]>([]);
  const [fullIngredients, setFullIngredients] = useState('');
  const [longevityMonths, setLongevityMonths] = useState('');
  const [datePurchased, setDatePurchased] = useState('');
  const [dateOpened, setDateOpened] = useState('');
  const [notes, setNotes] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [stoppedAt, setStoppedAt] = useState('');

  useEffect(() => {
    if (product) {
      setName(product.name);
      setBrand(product.brand || '');
      setImageUrl(product.image_url || '');
      setStepCategory(product.step_category);
      setTimeOfDay(product.time_of_day);
      setTimesPerWeek(product.times_per_week);
      setActiveIngredients(
        product.active_ingredients
          ? product.active_ingredients.split(',').map((i) => i.trim()).filter(Boolean)
          : []
      );
      setFullIngredients(product.full_ingredients || '');
      setLongevityMonths(product.longevity_months?.toString() || '');
      setDatePurchased(product.date_purchased || '');
      setDateOpened(product.date_opened || '');
      setNotes(product.notes || '');
      setStartedAt(product.started_at);
      setStoppedAt(product.stopped_at || '');
    }
  }, [product]);

  const handleSave = async () => {
    if (!productId) return;
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a product name.');
      return;
    }

    await updateProduct(productId, {
      name: name.trim(),
      brand: brand.trim() || undefined,
      image_url: imageUrl.trim() || undefined,
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
      stopped_at: stoppedAt.trim() || undefined,
    });

    router.back();
  };

  const handleDelete = () => {
    if (!productId) return;
    Alert.alert('Delete Product', `Permanently remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteProduct(productId);
          router.back();
        },
      },
    ]);
  };

  // Compute expiry info
  const expiryInfo = (() => {
    if (!product?.date_opened || !product?.longevity_months) return null;
    const opened = new Date(product.date_opened + 'T00:00:00');
    const expiry = new Date(opened);
    expiry.setMonth(expiry.getMonth() + product.longevity_months);
    const now = new Date();
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { expiry, daysLeft };
  })();

  if (!product) {
    return (
      <View style={styles.notFound}>
        <Text style={Typography.body}>Product not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Expiry banner */}
      {expiryInfo && (
        <View style={[styles.expiryBanner, expiryInfo.daysLeft <= 30 && styles.expiryBannerWarn]}>
          <Ionicons
            name={expiryInfo.daysLeft <= 30 ? 'warning-outline' : 'time-outline'}
            size={16}
            color={expiryInfo.daysLeft <= 30 ? Colors.error : Colors.primary}
          />
          <Text style={[styles.expiryText, expiryInfo.daysLeft <= 30 && styles.expiryTextWarn]}>
            {expiryInfo.daysLeft > 0
              ? `Expires in ${expiryInfo.daysLeft} day${expiryInfo.daysLeft !== 1 ? 's' : ''} (${expiryInfo.expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`
              : `Expired ${Math.abs(expiryInfo.daysLeft)} day${Math.abs(expiryInfo.daysLeft) !== 1 ? 's' : ''} ago`}
          </Text>
        </View>
      )}

      {/* Image */}
      {imageUrl ? (
        <View style={styles.imagePreview}>
          <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
        </View>
      ) : null}

      {/* ── Core Fields ──────────────────────────────────────── */}

      <Text style={styles.label}>PRODUCT NAME</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={Colors.textLight} />

      <Text style={styles.label}>BRAND</Text>
      <TextInput style={styles.input} value={brand} onChangeText={setBrand} placeholderTextColor={Colors.textLight} />

      <Text style={styles.label}>PRODUCT IMAGE URL</Text>
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
              <Ionicons name={info.icon as any} size={14} color={selected ? Colors.textOnPrimary : Colors.textSecondary} />
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{info.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>WHEN TO USE</Text>
      <View style={styles.pillRow}>
        {TIME_OF_DAY_USAGE_OPTIONS.map((option) => {
          const selected = timeOfDay === option.key;
          return (
            <TouchableOpacity key={option.key} style={[styles.pill, selected && styles.pillSelected]} onPress={() => setTimeOfDay(option.key)}>
              <Ionicons name={option.icon as any} size={16} color={selected ? Colors.textOnPrimary : Colors.textSecondary} />
              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>HOW OFTEN?</Text>
      <View style={styles.freqRow}>
        {FREQUENCY_OPTIONS.map((opt) => {
          const selected = timesPerWeek === opt.value;
          return (
            <TouchableOpacity key={opt.value} style={[styles.freqPill, selected && styles.freqPillSelected]} onPress={() => setTimesPerWeek(opt.value)}>
              <Text style={[styles.freqText, selected && styles.freqTextSelected]}>{opt.value === 7 ? 'Daily' : `${opt.value}x`}</Text>
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

      <Text style={styles.label}>FULL INGREDIENTS LIST</Text>
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
      <TextInput style={styles.input} value={longevityMonths} onChangeText={setLongevityMonths} placeholder="e.g., 12" placeholderTextColor={Colors.textLight} keyboardType="number-pad" />

      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={styles.label}>DATE PURCHASED</Text>
          <TextInput
            style={styles.input}
            value={datePurchased ? formatDateForDisplay(datePurchased) : ''}
            onChangeText={(text) => {
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

      <Text style={styles.label}>ADDED TO ROUTINE</Text>
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
            setStartedAt('');
          }
        }}
        placeholder="dd-mm-yyyy"
        placeholderTextColor={Colors.textLight}
      />

      <Text style={styles.label}>STOPPED USING (BLANK = ACTIVE)</Text>
      <TextInput
        style={styles.input}
        value={stoppedAt ? formatDateForDisplay(stoppedAt) : ''}
        onChangeText={(text) => {
          const parsed = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
          if (parsed) {
            const [, day, month, year] = parsed;
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            if (!isNaN(date.getTime())) {
              setStoppedAt(date.toISOString().split('T')[0]);
            }
          } else if (text === '') {
            setStoppedAt('');
          }
        }}
        placeholder="dd-mm-yyyy or leave empty"
        placeholderTextColor={Colors.textLight}
      />

      {/* ── Notes ────────────────────────────────────────────── */}

      <Text style={styles.label}>USAGE NOTES</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g., Apply to dry skin..."
        placeholderTextColor={Colors.textLight}
        multiline={true}
        numberOfLines={3}
      />

      {/* Actions */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.7}>
        <Text style={styles.deleteButtonText}>Delete Product</Text>
      </TouchableOpacity>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md + 4 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  // Expiry banner
  expiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '12',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 4,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  expiryBannerWarn: {
    backgroundColor: Colors.error + '12',
  },
  expiryText: { ...Typography.bodySmall, fontSize: 13, color: Colors.primaryDark, flex: 1 },
  expiryTextWarn: { color: Colors.error },

  // Image
  imagePreview: { alignItems: 'center', marginBottom: Spacing.md },
  productImage: { width: 140, height: 140, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceSecondary },

  // Sections
  sectionTitle: { ...Typography.subtitle, fontSize: 16, marginTop: Spacing.xl, marginBottom: Spacing.xs },
  label: { ...Typography.label, marginTop: Spacing.md, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, ...Typography.body, borderWidth: 1, borderColor: Colors.border },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  // Dates
  dateRow: { flexDirection: 'row', gap: Spacing.sm },
  dateField: { flex: 1 },

  // Pills & chips (same as add-product)
  pillRow: { flexDirection: 'row', gap: Spacing.sm },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm + 3, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, gap: 6 },
  pillSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { ...Typography.button, fontSize: 12, color: Colors.textSecondary },
  pillTextSelected: { color: Colors.textOnPrimary },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm + 4, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, gap: 5 },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { ...Typography.caption, color: Colors.textSecondary, fontSize: 12 },
  chipTextSelected: { color: Colors.textOnPrimary },
  freqRow: { flexDirection: 'row', gap: Spacing.sm },
  freqPill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm + 3, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  freqPillSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  freqText: { ...Typography.button, fontSize: 12, color: Colors.textSecondary },
  freqTextSelected: { color: Colors.textOnPrimary },

  // Actions
  saveButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, marginTop: Spacing.xl },
  saveButtonText: { ...Typography.button, color: Colors.textOnPrimary },
  deleteButton: { alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.error + '40' },
  deleteButtonText: { ...Typography.button, color: Colors.error },
});

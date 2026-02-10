import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Typography, Spacing, BorderRadius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useConfirm } from '../src/contexts/ConfirmContext';
import { useProducts } from '../src/hooks/useProducts';
import { useToast } from '../src/components/Toast';
import { CATEGORIES, CATEGORY_INFO } from '../src/constants/skincare';
import { IngredientSelector } from '../src/components/IngredientSelector';
import { DateInput } from '../src/components/DateInput';
import { useActiveIngredients } from '../src/hooks/useActiveIngredients';
import type { StepCategory } from '../src/types';

export default function EditProductScreen() {
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { products, updateProduct, deleteProduct } = useProducts();
  const { sections: ingredientSections } = useActiveIngredients();
  const product = products.find((p) => p.id === productId);
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const styles = createStyles(colors);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [stepCategory, setStepCategory] = useState<StepCategory>('serum');
  const [activeIngredients, setActiveIngredients] = useState<string[]>([]);
  const [fullIngredients, setFullIngredients] = useState('');
  const [longevityMonths, setLongevityMonths] = useState('');
  const [datePurchased, setDatePurchased] = useState('');
  const [dateOpened, setDateOpened] = useState('');
  const [notes, setNotes] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [stoppedAt, setStoppedAt] = useState('');

  const isFromCatalog = Boolean(product?.catalog_id);

  useEffect(() => {
    if (product) {
      setName(product.name ?? '');
      setBrand(product.brand || '');
      setSize(product.size || '');
      setImageUrl(product.image_url || '');
      setStepCategory(product.step_category ?? 'other');
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
      setStartedAt(product.started_at ?? '');
      setStoppedAt(product.stopped_at || '');
    }
  }, [product]);

  const todayStr = new Date().toISOString().split('T')[0];

  const handlePickImage = () => {
    showConfirm({
      title: 'Change Photo',
      message: 'Choose a source',
      buttons: [
        {
          text: 'Camera',
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              showToast('Permission Needed', { message: 'Camera access is required to take photos.', variant: 'warning' });
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              setImageUrl(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              showToast('Permission Needed', { message: 'Gallery access is required to pick photos.', variant: 'warning' });
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              setImageUrl(result.assets[0].uri);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  };

  const handleSave = async () => {
    if (!productId) return;
    if (!isFromCatalog && !name.trim()) {
      showToast('Missing Name', { message: 'Please enter a product name.', variant: 'warning' });
      return;
    }

    const updates: Parameters<typeof updateProduct>[1] = {
      longevity_months: longevityMonths ? parseInt(longevityMonths, 10) || undefined : undefined,
      date_purchased: datePurchased.trim() || undefined,
      date_opened: dateOpened.trim() || undefined,
      notes: notes.trim() || undefined,
      started_at: startedAt,
      stopped_at: stoppedAt.trim() || undefined,
    };
    if (!isFromCatalog) {
      updates.name = name.trim();
      updates.brand = brand.trim() || undefined;
      updates.image_url = imageUrl.trim() || undefined;
      updates.step_category = stepCategory;
    }
    await updateProduct(productId, updates);
    router.back();
  };

  const handleDelete = () => {
    if (!productId) return;
    showConfirm({
      title: 'Delete Product',
      message: `Permanently remove "${name}"?`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteProduct(productId);
            router.back();
          },
        },
      ],
    });
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
        <Text style={[Typography.body, { color: colors.text }]}>Product not found</Text>
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
            color={expiryInfo.daysLeft <= 30 ? colors.error : colors.primary}
          />
          <Text style={[styles.expiryText, expiryInfo.daysLeft <= 30 && styles.expiryTextWarn]}>
            {expiryInfo.daysLeft > 0
              ? `Expires in ${expiryInfo.daysLeft} day${expiryInfo.daysLeft !== 1 ? 's' : ''} (${expiryInfo.expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`
              : `Expired ${Math.abs(expiryInfo.daysLeft)} day${Math.abs(expiryInfo.daysLeft) !== 1 ? 's' : ''} ago`}
          </Text>
        </View>
      )}

      {/* Product photo */}
      <Text style={styles.label}>PRODUCT PHOTO</Text>
      {imageUrl ? (
        <View style={styles.imagePreview}>
          <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
          <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => setImageUrl('')}>
            <Ionicons name="close" size={14} color={colors.textOnPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.imageChangeBtn} onPress={handlePickImage}>
            <Ionicons name="camera-outline" size={14} color={colors.textOnPrimary} />
            <Text style={styles.imageChangeBtnText}>Change</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.imagePlaceholder} onPress={handlePickImage} activeOpacity={0.7}>
          <Ionicons name="camera-outline" size={32} color={colors.textLight} />
          <Text style={styles.imagePlaceholderText}>Tap to add photo</Text>
        </TouchableOpacity>
      )}

      {/* ── Core Fields ──────────────────────────────────────── */}

      <Text style={styles.label}>PRODUCT NAME</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholderTextColor={colors.textLight}
        editable={!isFromCatalog}
      />

      <Text style={styles.label}>BRAND</Text>
      <TextInput
        style={styles.input}
        value={brand}
        onChangeText={setBrand}
        placeholderTextColor={colors.textLight}
        editable={!isFromCatalog}
      />

      <Text style={styles.label}>SIZE</Text>
      <TextInput
        style={styles.input}
        value={size}
        onChangeText={setSize}
        placeholder="e.g., 100ml, 50g, 1.7 oz"
        placeholderTextColor={colors.textLight}
        editable={!isFromCatalog}
      />

      <Text style={styles.sectionTitle}>Step category</Text>
      <Text style={styles.label}>STEP CATEGORY</Text>
      <View style={styles.chipGrid}>
        {CATEGORIES.map((cat) => {
          const info = CATEGORY_INFO[cat];
          const selected = stepCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => !isFromCatalog && setStepCategory(cat)}
              disabled={isFromCatalog}
            >
              <Ionicons name={info.icon as any} size={14} color={selected ? colors.textOnPrimary : colors.textSecondary} />
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{info.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Ingredients ──────────────────────────────────────── */}

      <Text style={styles.sectionTitle}>Ingredients</Text>

      <Text style={styles.label}>ACTIVE / KEY INGREDIENTS</Text>
      <IngredientSelector
        selectedIngredients={activeIngredients}
        onSelectionChange={isFromCatalog ? () => {} : setActiveIngredients}
        ingredientSections={ingredientSections}
      />

      <Text style={styles.label}>FULL INGREDIENTS LIST</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={fullIngredients}
        onChangeText={setFullIngredients}
        placeholder="Aqua, Niacinamide, Pentylene Glycol..."
        placeholderTextColor={colors.textLight}
        multiline={true}
        numberOfLines={4}
        editable={!isFromCatalog}
      />

      {/* ── Longevity & Dates ────────────────────────────────── */}

      <Text style={styles.sectionTitle}>Longevity & Dates</Text>

      <Text style={styles.label}>PERIOD AFTER OPENING</Text>
      <View style={styles.longevityRow}>
        {[3, 6, 9, 12, 18, 24, 36].map((months) => {
          const selected = longevityMonths === String(months);
          return (
            <TouchableOpacity
              key={months}
              style={[styles.longevityChip, selected && styles.longevityChipSelected]}
              onPress={() => setLongevityMonths(selected ? '' : String(months))}
              activeOpacity={0.7}
            >
              <Text style={[styles.longevityChipText, selected && styles.longevityChipTextSelected]}>
                {months}M
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={styles.label}>DATE PURCHASED</Text>
          <DateInput value={datePurchased} onChangeDate={setDatePurchased} />
        </View>
        <View style={styles.dateField}>
          <Text style={styles.label}>DATE OPENED</Text>
          <DateInput value={dateOpened} onChangeDate={setDateOpened} />
        </View>
      </View>

      <Text style={styles.label}>ADDED TO ROUTINE</Text>
      <DateInput value={startedAt} onChangeDate={(date) => setStartedAt(date || startedAt)} />

      <Text style={styles.label}>STOPPED USING (BLANK = ACTIVE)</Text>
      <DateInput value={stoppedAt} onChangeDate={setStoppedAt} placeholder="dd-mm-yyyy or leave empty" />

      {/* ── Notes ────────────────────────────────────────────── */}

      <Text style={styles.label}>USAGE NOTES</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g., Apply to dry skin..."
        placeholderTextColor={colors.textLight}
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

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: Spacing.md + 4 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  // Expiry banner
  expiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '12',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 4,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  expiryBannerWarn: {
    backgroundColor: colors.error + '12',
  },
  expiryText: { ...Typography.bodySmall, fontSize: 13, color: colors.primaryDark, flex: 1 },
  expiryTextWarn: { color: colors.error },

  // Image picker
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    height: 140,
    gap: Spacing.xs,
  },
  imagePlaceholderText: {
    ...Typography.caption,
    color: colors.textLight,
    fontSize: 13,
  },
  imagePreview: { alignItems: 'center', marginBottom: Spacing.md },
  productImage: { width: 140, height: 140, borderRadius: BorderRadius.md, backgroundColor: colors.surfaceSecondary },
  imageRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: '50%',
    marginRight: -70 + 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text + '80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: BorderRadius.pill,
    backgroundColor: colors.primary,
    gap: 4,
  },
  imageChangeBtnText: {
    ...Typography.caption,
    fontSize: 11,
    color: colors.textOnPrimary,
    fontWeight: '600',
  },

  // Sections
  sectionTitle: { ...Typography.subtitle, fontSize: 16, color: colors.text, marginTop: Spacing.xl, marginBottom: Spacing.xs },
  label: { ...Typography.label, color: colors.textSecondary, marginTop: Spacing.md, marginBottom: Spacing.sm },
  input: { backgroundColor: colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, ...Typography.body, color: colors.text, borderWidth: 1, borderColor: colors.border },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  // Dates
  dateRow: { flexDirection: 'row', gap: Spacing.sm },
  dateField: { flex: 1 },

  // Pills & chips (same as add-product)
  pillRow: { flexDirection: 'row', gap: Spacing.sm },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm + 3, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 6 },
  pillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { ...Typography.button, fontSize: 12, color: colors.textSecondary },
  pillTextSelected: { color: colors.textOnPrimary },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm + 4, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 5 },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...Typography.caption, color: colors.textSecondary, fontSize: 12 },
  chipTextSelected: { color: colors.textOnPrimary },
  scheduleTypeRow: { flexDirection: 'row', gap: Spacing.sm },
  scheduleTypeBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm + 4, paddingHorizontal: Spacing.xs, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 4 },
  scheduleTypeBtnSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  scheduleTypeText: { ...Typography.button, fontSize: 13, color: colors.textSecondary },
  scheduleTypeTextSelected: { color: colors.textOnPrimary },
  scheduleTypeDesc: { ...Typography.caption, fontSize: 10, color: colors.textLight, textAlign: 'center' as const },
  scheduleTypeDescSelected: { color: colors.primaryLight },
  daysRow: { flexDirection: 'row', gap: Spacing.sm },
  dayCircle: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  dayCircleSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { ...Typography.button, fontSize: 12, color: colors.textSecondary },
  dayTextSelected: { color: colors.textOnPrimary },
  selectAll: { alignSelf: 'flex-end', marginTop: Spacing.xs, paddingVertical: 4 },
  selectAllText: { ...Typography.caption, color: colors.primary, fontWeight: '600' },
  cycleDaysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cycleDayBtn: { alignItems: 'center', paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, minWidth: 60, gap: 2 },
  cycleDayBtnSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  cycleDayNum: { ...Typography.subtitle, fontSize: 16, color: colors.textSecondary },
  cycleDayNumSelected: { color: colors.textOnPrimary },
  cycleDayLabel: { ...Typography.caption, fontSize: 10, color: colors.textLight },
  cycleDayLabelSelected: { color: colors.primaryLight },
  intervalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  intervalInput: { flex: 0, width: 80, textAlign: 'center' },
  intervalUnit: { ...Typography.body, fontWeight: '500', color: colors.textSecondary },
  scheduleHint: { ...Typography.caption, fontSize: 11, color: colors.textLight, marginTop: Spacing.sm, fontStyle: 'italic' },

  // Longevity chips
  longevityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  longevityChip: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  longevityChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  longevityChipText: { ...Typography.button, fontSize: 13, color: colors.textSecondary },
  longevityChipTextSelected: { color: colors.textOnPrimary },

  // Actions
  saveButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, marginTop: Spacing.xl },
  saveButtonText: { ...Typography.button, color: colors.textOnPrimary },
  deleteButton: { alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: colors.error + '40' },
  deleteButtonText: { ...Typography.button, color: colors.error },
});

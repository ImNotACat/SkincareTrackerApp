import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  SafeAreaView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useRoutine } from '../src/hooks/useRoutine';
import { useProducts } from '../src/hooks/useProducts';
import {
  CATEGORIES,
  CATEGORY_INFO,
  DAYS_OF_WEEK,
  ALL_DAYS,
  TIME_OF_DAY_OPTIONS,
  SCHEDULE_TYPE_OPTIONS,
} from '../src/constants/skincare';
import { useToast } from '../src/components/Toast';
import type { StepCategory, DayOfWeek, TimeOfDay, ScheduleType, Product } from '../src/types';

export default function AddStepScreen() {
  const router = useRouter();
  const { addStep, steps } = useRoutine();
  const { products, activeProducts } = useProducts();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const styles = createStyles(colors);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [productName, setProductName] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [category, setCategory] = useState<StepCategory>('cleanser');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');
  const [notes, setNotes] = useState('');

  // Schedule state
  const [scheduleType, setScheduleType] = useState<ScheduleType>('weekly');
  const [days, setDays] = useState<DayOfWeek[]>([...ALL_DAYS]);
  const [cycleLength, setCycleLength] = useState('4');
  const [cycleDays, setCycleDays] = useState<number[]>([1]);
  const [intervalDays, setIntervalDays] = useState('3');

  const todayStr = new Date().toISOString().split('T')[0];

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

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setName(product.name);
    setProductName(product.name);
    setCategory(product.step_category);
    setShowProductPicker(false);
    setProductSearch('');
  };

  const handleClearProduct = () => {
    setSelectedProduct(null);
    setName('');
    setProductName('');
  };

  const filteredProducts = productSearch.trim()
    ? products.filter((p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(productSearch.toLowerCase()))
      )
    : products;

  const handleCycleLengthChange = (val: string) => {
    setCycleLength(val);
    const num = parseInt(val, 10);
    if (num > 0) {
      // Remove any selected days that exceed the new length
      setCycleDays((prev) => prev.filter((d) => d <= num));
    }
  };

  const validate = (): boolean => {
    if (!name.trim()) {
      showToast('Missing Name', { message: 'Please enter a name for this step.', variant: 'warning' });
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

  const handleSave = async () => {
    if (!validate()) return;

    await addStep({
      name: name.trim(),
      product_name: productName.trim() || undefined,
      category,
      time_of_day: timeOfDay,
      order: steps.filter((s) => s.time_of_day === timeOfDay).length,
      notes: notes.trim() || undefined,
      schedule_type: scheduleType,
      days: scheduleType === 'weekly' ? days : [],
      cycle_length: scheduleType === 'cycle' ? parseInt(cycleLength, 10) : undefined,
      cycle_days: scheduleType === 'cycle' ? cycleDays : undefined,
      cycle_start_date: scheduleType === 'cycle' ? todayStr : undefined,
      interval_days: scheduleType === 'interval' ? parseInt(intervalDays, 10) : undefined,
      interval_start_date: scheduleType === 'interval' ? todayStr : undefined,
    });

    router.back();
  };

  const parsedCycleLength = parseInt(cycleLength, 10) || 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Product picker */}
      <Text style={styles.label}>SELECT PRODUCT</Text>
      {selectedProduct ? (
        <View style={styles.selectedProductCard}>
          {selectedProduct.image_url ? (
            <Image source={{ uri: selectedProduct.image_url }} style={styles.selectedProductImage} resizeMode="cover" />
          ) : (
            <View style={[styles.selectedProductImagePlaceholder, { backgroundColor: CATEGORY_INFO[selectedProduct.step_category].color + '18' }]}>
              <Ionicons name={CATEGORY_INFO[selectedProduct.step_category].icon as any} size={20} color={CATEGORY_INFO[selectedProduct.step_category].color} />
            </View>
          )}
          <View style={styles.selectedProductInfo}>
            <Text style={styles.selectedProductName} numberOfLines={1}>{selectedProduct.name}</Text>
            {selectedProduct.brand && <Text style={styles.selectedProductBrand} numberOfLines={1}>{selectedProduct.brand}</Text>}
          </View>
          <TouchableOpacity onPress={handleClearProduct} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={22} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.productPickerBtn}
          onPress={() => setShowProductPicker(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="flask-outline" size={20} color={colors.textLight} />
          <Text style={styles.productPickerBtnText}>Choose a product...</Text>
          <Ionicons name="chevron-down" size={18} color={colors.textLight} />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.addNewProductLink}
        onPress={() => router.push('/add-product')}
      >
        <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
        <Text style={styles.addNewProductText}>Or add a new product</Text>
      </TouchableOpacity>

      {/* Optional step name override */}
      <Text style={styles.label}>STEP NAME</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder={selectedProduct ? selectedProduct.name : 'e.g., Vitamin C Serum'}
        placeholderTextColor={colors.textLight}
      />

      {/* Product picker modal */}
      <Modal
        visible={showProductPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProductPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Product</Text>
            <TouchableOpacity onPress={() => setShowProductPicker(false)}>
              <Text style={styles.modalDoneText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalSearchContainer}>
            <Ionicons name="search-outline" size={18} color={colors.textLight} />
            <TextInput
              style={styles.modalSearchInput}
              value={productSearch}
              onChangeText={setProductSearch}
              placeholder="Search products..."
              placeholderTextColor={colors.textLight}
            />
            {productSearch.length > 0 && (
              <TouchableOpacity onPress={() => setProductSearch('')}>
                <Ionicons name="close-circle" size={18} color={colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const catInfo = CATEGORY_INFO[item.step_category];
              return (
                <TouchableOpacity
                  style={styles.productListItem}
                  onPress={() => handleSelectProduct(item)}
                  activeOpacity={0.6}
                >
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.productListImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.productListImagePlaceholder, { backgroundColor: catInfo.color + '18' }]}>
                      <Ionicons name={catInfo.icon as any} size={18} color={catInfo.color} />
                    </View>
                  )}
                  <View style={styles.productListInfo}>
                    <Text style={styles.productListName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.productListMeta} numberOfLines={1}>
                      {item.brand ? `${item.brand} · ` : ''}{catInfo.label}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyProducts}>
                <Text style={styles.emptyProductsText}>No products found</Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => { setShowProductPicker(false); router.push('/add-product'); }}
                >
                  <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                  <Text style={styles.emptyAddBtnText}>Add a product first</Text>
                </TouchableOpacity>
              </View>
            }
            contentContainerStyle={styles.productListContent}
          />
        </SafeAreaView>
      </Modal>

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
              <Text style={styles.scheduleHint}>
                Cycle starts today and repeats every {parsedCycleLength} days.
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
          <Text style={styles.scheduleHint}>
            First occurrence is today, then every {parseInt(intervalDays, 10) || '…'} days after that.
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
        <Text style={styles.saveButtonText}>Add Step</Text>
      </TouchableOpacity>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: Spacing.md + 4 },
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

  // Product picker
  selectedProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    padding: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  selectedProductImage: { width: 40, height: 40, borderRadius: BorderRadius.sm },
  selectedProductImagePlaceholder: { width: 40, height: 40, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  selectedProductInfo: { flex: 1 },
  selectedProductName: { ...Typography.body, fontSize: 14, color: colors.text, fontWeight: '500' },
  selectedProductBrand: { ...Typography.caption, fontSize: 12, color: colors.textSecondary },
  productPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  productPickerBtnText: { ...Typography.body, flex: 1, color: colors.textLight },
  addNewProductLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: 4,
    alignSelf: 'flex-start',
  },
  addNewProductText: { ...Typography.caption, color: colors.primary, fontWeight: '600' },

  // Product picker modal
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: { ...Typography.subtitle, fontSize: 18, color: colors.text },
  modalDoneText: { ...Typography.button, fontSize: 16, color: colors.primary },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.md + 4,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: Spacing.sm,
  },
  modalSearchInput: { ...Typography.body, flex: 1, color: colors.text, padding: 0 },
  productListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: Spacing.sm + 2,
  },
  productListImage: { width: 44, height: 44, borderRadius: BorderRadius.sm },
  productListImagePlaceholder: { width: 44, height: 44, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  productListInfo: { flex: 1 },
  productListName: { ...Typography.body, fontSize: 15, color: colors.text },
  productListMeta: { ...Typography.caption, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  productListContent: { paddingBottom: 40 },
  emptyProducts: { padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  emptyProductsText: { ...Typography.body, color: colors.textLight },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emptyAddBtnText: { ...Typography.caption, color: colors.primary, fontWeight: '600' },

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

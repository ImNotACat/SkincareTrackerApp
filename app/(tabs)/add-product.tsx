import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useProducts } from '../../src/hooks/useProducts';
import { useToast } from '../../src/components/Toast';
import { useConfirm } from '../../src/contexts/ConfirmContext';
import { importProductFromUrl } from '../../src/lib/product-import';
import { useUnifiedProductSearch, type UnifiedProduct } from '../../src/hooks/useUnifiedProductSearch';
import { useActiveIngredients } from '../../src/hooks/useActiveIngredients';
import { CATEGORIES, CATEGORY_INFO } from '../../src/constants/skincare';
import { getTodayString } from '../../src/lib/dateUtils';
import { IngredientSelector } from '../../src/components/IngredientSelector';
import { DateInput } from '../../src/components/DateInput';
import type { StepCategory } from '../../src/types';

type AddMode = 'manual' | 'import' | 'search';

export default function AddProductScreen() {
  const router = useRouter();
  const { addProduct, products } = useProducts();
  const { sections: ingredientSections } = useActiveIngredients();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const styles = createStyles(colors);

  const [mode, setMode] = useState<AddMode>('manual');
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Search state
  const { results: searchResults, isSearching, hasSearched, search, clearResults } =
    useUnifiedProductSearch();
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Track catalog linkage when a product was selected from search
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | undefined>(undefined);

  // Product fields
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [stepCategory, setStepCategory] = useState<StepCategory>('serum');
  const [activeIngredients, setActiveIngredients] = useState<string[]>([]);
  const [fullIngredients, setFullIngredients] = useState('');
  const [longevityMonths, setLongevityMonths] = useState('');
  const [datePurchased, setDatePurchased] = useState('');
  const [dateOpened, setDateOpened] = useState('');
  const [notes, setNotes] = useState('');
  const [startedAt, setStartedAt] = useState(getTodayString());

  const todayStr = new Date().toISOString().split('T')[0];

  // Reset form and scroll to top whenever the screen is opened/focused (e.g. tapping + to add a new product)
  useFocusEffect(
    useCallback(() => {
      setMode('manual');
      setImportUrl('');
      setIsImporting(false);
      setSearchQuery('');
      setSelectedCatalogId(undefined);
      setName('');
      setBrand('');
      setSize('');
      setImageUrl('');
      setSourceUrl('');
      setStepCategory('serum');
      setActiveIngredients([]);
      setFullIngredients('');
      setLongevityMonths('');
      setDatePurchased('');
      setDateOpened('');
      setNotes('');
      setStartedAt(getTodayString());
      clearResults();
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
      // Scroll to top so the user always sees the start of the form
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      });
    }, [clearResults]),
  );

  const handlePickImage = () => {
    showConfirm({
      title: 'Add Photo',
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

  const handleImport = async () => {
    if (!importUrl.trim()) {
      showToast('No URL', { message: 'Please paste a product URL first.', variant: 'warning' });
      return;
    }

    setIsImporting(true);
    try {
      const data = await importProductFromUrl(importUrl.trim());

      if (data.name) setName(data.name);
      if (data.brand) setBrand(data.brand);
      if (data.size) setSize(data.size);
      if (data.image_url) setImageUrl(data.image_url);
      if (data.ingredients) setFullIngredients(data.ingredients);
      if (data.active_ingredients && data.active_ingredients.length > 0) {
        setActiveIngredients(data.active_ingredients);
      }
      if (data.step_category) setStepCategory(data.step_category);
      setSourceUrl(data.source_url);

      // Auto-switch to show the form so user can review/complete
      setMode('manual');

      showToast('Product Imported', {
        message: `Found: ${data.name || 'product'}${data.brand ? ` by ${data.brand}` : ''}`,
        variant: 'success',
        duration: 4000,
      });
    } catch (error) {
      showToast('Import Failed', { message: 'Could not extract product info. Try adding it manually.', variant: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  // ── Search handlers ──────────────────────────────────────────────────────

  const handleSearchQueryChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      // Debounce: trigger search 500ms after user stops typing
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (text.trim().length >= 2) {
        searchTimerRef.current = setTimeout(() => {
          search(text.trim());
        }, 500);
      } else {
        clearResults();
      }
    },
    [search, clearResults],
  );

  const handleSearchSubmit = useCallback(() => {
    if (searchQuery.trim().length >= 2) {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      search(searchQuery.trim());
    }
  }, [searchQuery, search]);

  /**
   * Called when the user taps a search result.
   * Checks for duplicates, then populates the form and switches to manual mode.
   */
  const handleSelectSearchResult = useCallback(
    (product: UnifiedProduct) => {
      const populateForm = () => {
        if (product.name) setName(product.name);
        if (product.brand) setBrand(product.brand);
        if (product.size) setSize(product.size);
        if (product.image_url) setImageUrl(product.image_url);
        if (product.source_url) setSourceUrl(product.source_url);
        if (product.ingredients) setFullIngredients(product.ingredients);
        if (product.active_ingredients && product.active_ingredients.length > 0) {
          setActiveIngredients(product.active_ingredients);
        }
        if (product.step_category) setStepCategory(product.step_category);

        // Track catalog linkage for save
        setSelectedCatalogId(product._catalogId || undefined);

        // Switch to form so user can review and set routine details
        setMode('manual');

        showToast('Product Selected', {
          message: `${product.name}${product.brand ? ` by ${product.brand}` : ''} — review details below.`,
          variant: 'success',
          duration: 3000,
        });
      };

      // Check if user already has this product (same name + brand)
      const normalizedName = product.name.toLowerCase().trim();
      const normalizedBrand = (product.brand || '').toLowerCase().trim();
      const duplicate = products.find((p) => {
        const pName = p.name.toLowerCase().trim();
        const pBrand = (p.brand || '').toLowerCase().trim();
        return pName === normalizedName && pBrand === normalizedBrand;
      });

      if (duplicate) {
        showConfirm({
          title: 'Possible Duplicate',
          message: `A product named "${product.name}"${product.brand ? ` by ${product.brand}` : ''} already exists in your products. Add it anyway?`,
          buttons: [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Add Anyway', onPress: populateForm },
          ],
        });
      } else {
        populateForm();
      }
    },
    [products, showToast, showConfirm],
  );

  // ── Save handler ───────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Missing Name', { message: 'Please enter a product name.', variant: 'warning' });
      return;
    }
    if (isSaving) return;
    setIsSaving(true);
    try {
      await addProduct(
        {
          catalog_id: selectedCatalogId,
          name: name.trim(),
          brand: brand.trim() || undefined,
          size: size.trim() || undefined,
          image_url: imageUrl.trim() || undefined,
          source_url: sourceUrl.trim() || undefined,
          step_category: stepCategory,
          active_ingredients: activeIngredients.length > 0 ? activeIngredients.join(', ') : undefined,
          full_ingredients: fullIngredients.trim() || undefined,
          longevity_months: longevityMonths ? parseInt(longevityMonths, 10) || undefined : undefined,
          date_purchased: datePurchased.trim() || undefined,
          date_opened: dateOpened.trim() || undefined,
          notes: notes.trim() || undefined,
          started_at: startedAt,
        },
        selectedCatalogId,
      );
      // Always go to Products tab after save (add-product is a tab; router.back() can fail if there's no stack)
      router.replace('/(tabs)/products');
    } catch (error) {
      showToast('Error', { message: 'Failed to add product. Please try again.', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>
      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'search' && styles.modeButtonActive]}
          onPress={() => setMode('search')}
        >
          <Ionicons
            name="search-outline"
            size={16}
            color={mode === 'search' ? colors.textOnPrimary : colors.textSecondary}
          />
          <Text style={[styles.modeText, mode === 'search' && styles.modeTextActive]}>
            Search
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
            URL
          </Text>
        </TouchableOpacity>
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
            Manual
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search section */}
      {mode === 'search' && (
        <View style={styles.searchSection}>
          <Text style={styles.importHint}>
            Search by product name or brand to find and add products.
          </Text>
          <View style={styles.searchInputRow}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search-outline" size={18} color={colors.textLight} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={handleSearchQueryChange}
                placeholder="e.g., Niacinamide, CeraVe, The Ordinary..."
                placeholderTextColor={colors.textLight}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    clearResults();
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textLight} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Search results */}
          {isSearching && (
            <View style={styles.searchLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.searchLoadingText}>Searching...</Text>
            </View>
          )}

          {!isSearching && hasSearched && searchResults.length === 0 && (
            <View style={styles.searchEmpty}>
              <Ionicons name="search-outline" size={32} color={colors.textLight} />
              <Text style={styles.searchEmptyText}>No products found</Text>
              <Text style={styles.searchEmptyHint}>
                Try a different search term, or add the product manually.
              </Text>
            </View>
          )}

          {!isSearching && searchResults.length > 0 && (
            <View style={styles.searchResultsList}>
              <Text style={styles.searchResultsCount}>
                {searchResults.length} product{searchResults.length !== 1 ? 's' : ''} found
              </Text>
              {searchResults.map((product, index) => {
                const catInfo = product.step_category
                  ? CATEGORY_INFO[product.step_category]
                  : null;
                return (
                  <TouchableOpacity
                    key={`${product._source}-${product._catalogId || product._obfCode || index}`}
                    style={styles.searchResultCard}
                    onPress={() => handleSelectSearchResult(product)}
                    activeOpacity={0.7}
                  >
                    {product.image_url ? (
                      <Image
                        source={{ uri: product.image_url }}
                        style={styles.searchResultImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.searchResultImagePlaceholder}>
                        <Ionicons
                          name={(catInfo?.icon || 'flask-outline') as any}
                          size={22}
                          color={colors.textLight}
                        />
                      </View>
                    )}
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName} numberOfLines={2}>
                        {product.name}
                      </Text>
                      {product.brand ? (
                        <Text style={styles.searchResultBrand} numberOfLines={1}>
                          {product.brand}
                        </Text>
                      ) : null}
                      {catInfo && (
                        <View style={[styles.searchCategoryBadge, { backgroundColor: catInfo.color + '20' }]}>
                          <Text style={[styles.searchCategoryText, { color: catInfo.color }]}>
                            {catInfo.label}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

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

      {/* ── Form (hidden when in search mode) ──────────────────────── */}
      {mode !== 'search' && (
      <>
      <Text style={styles.label}>PRODUCT PHOTO</Text>
      {imageUrl ? (
        <View style={styles.imagePreview}>
          <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
          <TouchableOpacity style={styles.imageRemove} onPress={() => setImageUrl('')}>
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

      <Text style={styles.label}>SIZE</Text>
      <TextInput
        style={styles.input}
        value={size}
        onChangeText={setSize}
        placeholder="e.g., 100ml, 50g, 1.7 oz"
        placeholderTextColor={colors.textLight}
      />

      {/* ── Ingredients ──────────────────────────────────────── */}

      <Text style={styles.sectionTitle}>Ingredients</Text>

      <Text style={styles.label}>ACTIVE / KEY INGREDIENTS</Text>
      <IngredientSelector
        selectedIngredients={activeIngredients}
        onSelectionChange={setActiveIngredients}
        ingredientSections={ingredientSections}
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
      <Text style={styles.hint}>Usually printed on the jar icon on packaging (e.g., 12M)</Text>

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

      <Text style={styles.label}>ADDED TO ROUTINE ON</Text>
      <DateInput
        value={startedAt}
        onChangeDate={(date) => setStartedAt(date || getTodayString())}
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
      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={handleSave}
        activeOpacity={0.85}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={colors.textOnPrimary} />
        ) : (
          <Text style={styles.saveButtonText}>Add Product</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: Spacing.xxl }} />
      </>
      )}
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
  modeText: { ...Typography.button, fontSize: 12, color: colors.textSecondary },
  modeTextActive: { color: colors.textOnPrimary },

  // Search section
  searchSection: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  searchInput: {
    ...Typography.body,
    flex: 1,
    padding: 0,
    color: colors.text,
  },
  searchLoading: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  searchLoadingText: {
    ...Typography.bodySmall,
    color: colors.textSecondary,
  },
  searchEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  searchEmptyText: {
    ...Typography.subtitle,
    color: colors.textSecondary,
  },
  searchEmptyHint: {
    ...Typography.bodySmall,
    color: colors.textLight,
    textAlign: 'center',
  },
  searchResultsList: {
    gap: Spacing.xs,
  },
  searchResultsCount: {
    ...Typography.label,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchResultImage: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  searchResultImagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultInfo: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  searchResultName: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: 2,
    color: colors.text,
  },
  searchResultBrand: {
    ...Typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  searchCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
  },
  searchCategoryText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },

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

  // Chips (e.g. category)
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

  // Longevity chips
  longevityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  longevityChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  longevityChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  longevityChipText: {
    ...Typography.button,
    fontSize: 13,
    color: colors.textSecondary,
  },
  longevityChipTextSelected: {
    color: colors.textOnPrimary,
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: { ...Typography.button, color: colors.textOnPrimary },
});

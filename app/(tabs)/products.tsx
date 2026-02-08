import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useProducts } from '../../src/hooks/useProducts';
import { useWishlist } from '../../src/hooks/useWishlist';
import { searchProducts } from '../../src/lib/openbeautyfacts';
import { ProductCard } from '../../src/components/ProductCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { EmptyState } from '../../src/components/EmptyState';
import type { Product } from '../../src/types';
import type { OpenBeautyFactsProduct } from '../../src/lib/openbeautyfacts';

type TopTab = 'my-products' | 'explore';
type ProductFilter = 'active' | 'stopped' | 'all' | 'wishlist';

// ─── My Products Section ─────────────────────────────────────────────────────

function MyProductsSection() {
  const { colors } = useTheme();
  const router = useRouter();
  const { activeProducts, inactiveProducts, products, stopProduct, restartProduct } =
    useProducts();
  const { wishlist, removeFromWishlist } = useWishlist();
  const [filter, setFilter] = useState<ProductFilter>('active');
  const styles = createStyles(colors);

  const displayProducts =
    filter === 'active'
      ? activeProducts
      : filter === 'stopped'
        ? inactiveProducts
        : filter === 'wishlist'
          ? []
          : products;

  const handlePress = (product: Product) => {
    router.push({ pathname: '/product-detail', params: { productId: product.id } });
  };

  const handleStop = (product: Product) => {
    Alert.alert(
      'Stop Using Product',
      `Mark "${product.name}" as stopped? You can restart it later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop', style: 'destructive', onPress: () => stopProduct(product.id) },
      ],
    );
  };

  const handleRestart = (product: Product) => {
    Alert.alert(
      'Restart Product',
      `Start using "${product.name}" again from today?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restart', onPress: () => restartProduct(product.id) },
      ],
    );
  };

  const filters: { key: ProductFilter; label: string; count: number; icon?: string }[] = [
    { key: 'active', label: 'Active', count: activeProducts.length },
    { key: 'stopped', label: 'Stopped', count: inactiveProducts.length },
    { key: 'all', label: 'All', count: products.length },
    { key: 'wishlist', label: 'Wishlist', count: wishlist.length, icon: 'heart' },
  ];

  return (
    <>
      {/* Sub-filter pills */}
      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {filters.map((f) => {
          const isActive = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setFilter(f.key)}
            >
              {f.icon && (
                <Ionicons
                  name={(isActive ? f.icon : f.icon + '-outline') as any}
                  size={13}
                  color={isActive ? colors.textOnPrimary : colors.textSecondary}
                  style={{ marginRight: 3 }}
                />
              )}
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {f.label} ({f.count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {filter === 'wishlist' ? (
          wishlist.length === 0 ? (
            <EmptyState
              icon="heart-outline"
              title="No wishlist items"
              message="Heart products in Explore to add them to your wishlist."
            />
          ) : (
            <>
              <SectionHeader
                icon="heart"
                title="Wishlist"
                subtitle={`${wishlist.length} item${wishlist.length !== 1 ? 's' : ''}`}
              />
              {wishlist.map((item) => (
                <View key={item.id} style={styles.wishlistCard}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.wishlistImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.wishlistImagePlaceholder}>
                      <Ionicons name="flask-outline" size={24} color={colors.textLight} />
                    </View>
                  )}
                  <View style={styles.wishlistInfo}>
                    <Text style={styles.wishlistName} numberOfLines={2}>{item.product_name}</Text>
                    {item.brand && <Text style={styles.wishlistBrand} numberOfLines={1}>{item.brand}</Text>}
                  </View>
                  <TouchableOpacity
                    onPress={() => removeFromWishlist(item.id)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="heart" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )
        ) : displayProducts.length === 0 ? (
          <EmptyState
            icon="flask-outline"
            title={filter === 'active' ? 'No active products' : filter === 'stopped' ? 'No stopped products' : 'No products yet'}
            message={
              filter === 'active'
                ? 'Track the products in your skincare routine with the + button.'
                : filter === 'stopped'
                  ? "Products you've stopped using will appear here."
                  : 'Start tracking your skincare products.'
            }
          />
        ) : (
          <>
            <SectionHeader
              icon="flask-outline"
              title={
                filter === 'active'
                  ? 'Currently Using'
                  : filter === 'stopped'
                    ? 'Previously Used'
                    : 'All Products'
              }
              subtitle={`${displayProducts.length} product${displayProducts.length !== 1 ? 's' : ''}`}
            />
            {displayProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={handlePress}
                onStop={!product.stopped_at ? handleStop : undefined}
                onRestart={product.stopped_at ? handleRestart : undefined}
              />
            ))}
          </>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </>
  );
}

// ─── Explore Section ─────────────────────────────────────────────────────────

function ExploreSection() {
  const { colors } = useTheme();
  const { wishlist, addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<OpenBeautyFactsProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const styles = createStyles(colors);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const result = await searchProducts(searchQuery.trim());
      setProducts(result.products);
    } catch (error) {
      console.error('Search failed:', error);
      setProducts([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleToggleWishlist = async (product: OpenBeautyFactsProduct) => {
    const productId = product.code;
    if (isInWishlist(productId)) {
      const item = wishlist.find((w) => w.product_id === productId);
      if (item) {
        await removeFromWishlist(item.id);
      }
    } else {
      await addToWishlist({
        product_id: productId,
        product_name: product.product_name || 'Unknown Product',
        brand: product.brands || undefined,
        image_url: product.image_url || undefined,
        source_url: product.url || undefined,
      });
    }
  };

  return (
    <>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search products..."
            placeholderTextColor={colors.textLight}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={20} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.searchButton, (isSearching || !searchQuery.trim()) && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color={colors.textOnPrimary} />
          ) : (
            <Ionicons name="search" size={20} color={colors.textOnPrimary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Results */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {!hasSearched ? (
          <EmptyState
            icon="search-outline"
            title="Search for products"
            message="Enter a product name, brand, or ingredient to discover new skincare products."
          />
        ) : isSearching && products.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : products.length === 0 ? (
          <EmptyState
            icon="sad-outline"
            title="No products found"
            message="Try a different search term or check your internet connection."
          />
        ) : (
          <>
            <Text style={styles.resultsHeader}>
              {products.length} product{products.length !== 1 ? 's' : ''} found
            </Text>
            {products.map((product) => {
              const inWishlist = isInWishlist(product.code);
              return (
                <TouchableOpacity
                  key={product.code}
                  style={styles.exploreCard}
                  activeOpacity={0.7}
                >
                  {product.image_url ? (
                    <Image source={{ uri: product.image_url }} style={styles.exploreImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.exploreImagePlaceholder}>
                      <Ionicons name="flask-outline" size={32} color={colors.textLight} />
                    </View>
                  )}
                  <View style={styles.exploreInfo}>
                    <Text style={styles.exploreName} numberOfLines={2}>
                      {product.product_name || 'Unknown Product'}
                    </Text>
                    {product.brands && (
                      <Text style={styles.exploreBrand} numberOfLines={1}>
                        {product.brands}
                      </Text>
                    )}
                    {product.ingredients_text && (
                      <Text style={styles.exploreIngredients} numberOfLines={2}>
                        {product.ingredients_text.substring(0, 100)}...
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.heartButton}
                    onPress={() => handleToggleWishlist(product)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons
                      name={inWishlist ? 'heart' : 'heart-outline'}
                      size={24}
                      color={inWishlist ? colors.error : colors.textLight}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProductsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [topTab, setTopTab] = useState<TopTab>('my-products');
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {/* Top toggle: My Products / Explore */}
      <View style={styles.topToggleContainer}>
        <TouchableOpacity
          style={[styles.topToggleButton, topTab === 'my-products' && styles.topToggleActive]}
          onPress={() => setTopTab('my-products')}
        >
          <Ionicons
            name="flask-outline"
            size={16}
            color={topTab === 'my-products' ? colors.textOnPrimary : colors.textSecondary}
          />
          <Text style={[styles.topToggleText, topTab === 'my-products' && styles.topToggleTextActive]}>
            My Products
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.topToggleButton, topTab === 'explore' && styles.topToggleActive]}
          onPress={() => setTopTab('explore')}
        >
          <Ionicons
            name="search-outline"
            size={16}
            color={topTab === 'explore' ? colors.textOnPrimary : colors.textSecondary}
          />
          <Text style={[styles.topToggleText, topTab === 'explore' && styles.topToggleTextActive]}>
            Explore
          </Text>
        </TouchableOpacity>
      </View>

      {topTab === 'my-products' ? <MyProductsSection /> : <ExploreSection />}

      {/* FAB — only show on My Products */}
      {topTab === 'my-products' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/add-product')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color={colors.textOnPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Top toggle (My Products / Explore)
  topToggleContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md + 4,
    marginTop: Spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: BorderRadius.pill,
    padding: 3,
  },
  topToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.pill,
    gap: 6,
  },
  topToggleActive: {
    backgroundColor: colors.primary,
  },
  topToggleText: {
    ...Typography.button,
    fontSize: 13,
    color: colors.textSecondary,
  },
  topToggleTextActive: {
    color: colors.textOnPrimary,
  },

  // Sub-filter pills (My Products)
  filterScroll: {
    flexGrow: 0,
    marginTop: Spacing.md,
  },
  filterRow: {
    paddingHorizontal: Spacing.md + 4,
    gap: Spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    ...Typography.button,
    fontSize: 12,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.textOnPrimary,
  },

  // Shared scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md + 4,
  },

  // FAB
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
  bottomSpacer: {
    height: 80,
  },

  // Wishlist cards (My Products)
  wishlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wishlistImage: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.surfaceSecondary,
    marginRight: Spacing.md,
  },
  wishlistImagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  wishlistInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  wishlistName: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: 2,
    color: colors.text,
  },
  wishlistBrand: {
    ...Typography.caption,
    color: colors.textLight,
  },

  // Search bar (Explore)
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.md,
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
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    ...Typography.body,
    flex: 1,
    padding: 0,
    color: colors.text,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },

  // Explore results
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  loadingText: {
    ...Typography.bodySmall,
    marginTop: Spacing.md,
    color: colors.textSecondary,
  },
  resultsHeader: {
    ...Typography.label,
    marginBottom: Spacing.md,
    color: colors.textSecondary,
  },
  exploreCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exploreImage: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  exploreImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  exploreName: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: 4,
    color: colors.text,
  },
  exploreBrand: {
    ...Typography.caption,
    marginBottom: 4,
    color: colors.textSecondary,
  },
  exploreIngredients: {
    ...Typography.caption,
    fontSize: 11,
    color: colors.textLight,
  },
  heartButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xs,
  },
});

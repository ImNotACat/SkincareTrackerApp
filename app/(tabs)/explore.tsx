import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { searchProducts } from '../../src/lib/openbeautyfacts';
import { useWishlist } from '../../src/hooks/useWishlist';
import { EmptyState } from '../../src/components/EmptyState';
import type { OpenBeautyFactsProduct } from '../../src/lib/openbeautyfacts';

export default function ExploreScreen() {
  const { colors } = useTheme();
  const { wishlist, addToWishlist, removeFromWishlist, isInWishlist, reload } = useWishlist();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<OpenBeautyFactsProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
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
          style={[styles.searchButton, isSearching && styles.searchButtonDisabled]}
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isSearching} onRefresh={handleSearch} tintColor={colors.primary} />}
      >
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
            <Text style={styles.resultsHeader}>{products.length} product{products.length !== 1 ? 's' : ''} found</Text>
            {products.map((product) => {
              const inWishlist = isInWishlist(product.code);
              return (
                <TouchableOpacity
                  key={product.code}
                  style={styles.productCard}
                  activeOpacity={0.7}
                >
                  {product.image_url ? (
                    <Image source={{ uri: product.image_url }} style={styles.productImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <Ionicons name="flask-outline" size={32} color={colors.textLight} />
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.product_name || 'Unknown Product'}
                    </Text>
                    {product.brands && (
                      <Text style={styles.productBrand} numberOfLines={1}>
                        {product.brands}
                      </Text>
                    )}
                    {product.ingredients_text && (
                      <Text style={styles.productIngredients} numberOfLines={2}>
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
    </View>
  );
}

const createStyles = (colors: typeof import('../../src/constants/theme').Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: Spacing.md + 4,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md + 4,
  },
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
  productCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  productImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  productName: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: 4,
    color: colors.text,
  },
  productBrand: {
    ...Typography.caption,
    marginBottom: 4,
    color: colors.textSecondary,
  },
  productIngredients: {
    ...Typography.caption,
    fontSize: 11,
    color: colors.textLight,
  },
  heartButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xs,
  },
  bottomSpacer: {
    height: Spacing.xxl,
  },
});

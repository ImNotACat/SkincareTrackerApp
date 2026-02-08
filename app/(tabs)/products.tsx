import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { useProducts } from '../../src/hooks/useProducts';
import { useWishlist } from '../../src/hooks/useWishlist';
import { ProductCard } from '../../src/components/ProductCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { EmptyState } from '../../src/components/EmptyState';
import type { Product } from '../../src/types';

type TabFilter = 'active' | 'stopped' | 'all' | 'wishlist';

export default function ProductsScreen() {
  const router = useRouter();
  const { activeProducts, inactiveProducts, products, stopProduct, restartProduct } =
    useProducts();
  const { wishlist, removeFromWishlist } = useWishlist();
  const [tab, setTab] = useState<TabFilter>('active');

  const displayProducts =
    tab === 'active'
      ? activeProducts
      : tab === 'stopped'
        ? inactiveProducts
        : tab === 'wishlist'
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

  return (
    <View style={styles.container}>
      {/* Tab pills */}
      <View style={styles.tabBar}>
        {(['active', 'stopped', 'all', 'wishlist'] as TabFilter[]).map((t) => {
          const isActive = tab === t;
          const count =
            t === 'active'
              ? activeProducts.length
              : t === 'stopped'
                ? inactiveProducts.length
                : t === 'wishlist'
                  ? wishlist.length
                  : products.length;
          return (
            <TouchableOpacity
              key={t}
              style={[styles.tabPill, isActive && styles.tabPillActive]}
              onPress={() => setTab(t)}
            >
              {t === 'wishlist' && (
                <Ionicons
                  name={isActive ? 'heart' : 'heart-outline'}
                  size={14}
                  color={isActive ? Colors.textOnPrimary : Colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {t === 'wishlist' ? 'Wishlist' : t.charAt(0).toUpperCase() + t.slice(1)} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {tab === 'wishlist' ? (
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
                      <Ionicons name="flask-outline" size={24} color={Colors.textLight} />
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
                    <Ionicons name="heart" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )
        ) : displayProducts.length === 0 ? (
          <EmptyState
            icon="flask-outline"
            title={tab === 'active' ? 'No active products' : tab === 'stopped' ? 'No stopped products' : 'No products yet'}
            message={
              tab === 'active'
                ? 'Track the products in your skincare routine with the + button.'
                : tab === 'stopped'
                  ? "Products you've stopped using will appear here."
                  : 'Start tracking your skincare products.'
            }
          />
        ) : (
          <>
            <SectionHeader
              icon="flask-outline"
              title={
                tab === 'active'
                  ? 'Currently Using'
                  : tab === 'stopped'
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

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-product')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color={Colors.textOnPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md + 4,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  tabPill: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tabPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    ...Typography.button,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.textOnPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md + 4,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomSpacer: {
    height: 80,
  },
  wishlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  wishlistImage: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceSecondary,
    marginRight: Spacing.md,
  },
  wishlistImagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceSecondary,
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
  },
  wishlistBrand: {
    ...Typography.caption,
  },
});

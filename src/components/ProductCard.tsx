import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { CATEGORY_INFO } from '../constants/skincare';
import type { ProductWithCatalog } from '../types';

interface ProductCardProps {
  product: ProductWithCatalog;
  onPress: (product: ProductWithCatalog) => void;
  onStop?: (product: ProductWithCatalog) => void;
  onRestart?: (product: ProductWithCatalog) => void;
}

function getExpiryInfo(product: ProductWithCatalog): { label: string; isWarning: boolean } | null {
  if (!product.date_opened || !product.longevity_months) return null;
  const opened = new Date(product.date_opened + 'T00:00:00');
  const expiry = new Date(opened);
  expiry.setMonth(expiry.getMonth() + product.longevity_months);
  const now = new Date();
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { label: 'Expired', isWarning: true };
  if (daysLeft <= 30) return { label: `${daysLeft}d left`, isWarning: true };
  if (daysLeft <= 90) return { label: `${Math.round(daysLeft / 30)}mo left`, isWarning: false };
  return { label: `${product.longevity_months}M PAO`, isWarning: false };
}

export function ProductCard({ product, onPress, onStop, onRestart }: ProductCardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const category = CATEGORY_INFO[product.step_category ?? 'other'];
  const isActive = !product.stopped_at;
  const expiry = getExpiryInfo(product);

  return (
    <TouchableOpacity
      style={[styles.container, !isActive && styles.containerInactive]}
      onPress={() => onPress(product)}
      activeOpacity={0.7}
    >
      {product.image_url ? (
        <Image source={{ uri: product.image_url }} style={styles.thumbnail} resizeMode="cover" />
      ) : (
        <View style={[styles.iconCircle, { backgroundColor: category.color + '18' }]}>
          <Ionicons name={category.icon as any} size={20} color={category.color} />
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.name, !isActive && styles.nameInactive]} numberOfLines={1}>
            {product.name}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
                {isActive ? 'Active' : 'Stopped'}
              </Text>
            </View>
            {isActive && onStop && (
              <TouchableOpacity onPress={() => onStop(product)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="pause-circle-outline" size={18} color={colors.warning} />
              </TouchableOpacity>
            )}
            {!isActive && onRestart && (
              <TouchableOpacity onPress={() => onRestart(product)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="play-circle-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {product.brand && (
          <Text style={styles.brand} numberOfLines={1}>{product.brand}</Text>
        )}

        {product.active_ingredients && (
          <Text style={styles.ingredients} numberOfLines={1}>
            {product.active_ingredients}
          </Text>
        )}

        <View style={styles.metaRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{category.label}</Text>
          </View>
          {expiry && (
            <View style={[styles.pill, expiry.isWarning && styles.pillWarning]}>
              <Text style={[styles.pillText, expiry.isWarning && styles.pillTextWarning]}>
                {expiry.label}
              </Text>
            </View>
          )}
        </View>

        {product.notes && (
          <Text style={styles.notes} numberOfLines={1}>{product.notes}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  containerInactive: { opacity: 0.55 },

  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.surfaceSecondary,
    marginRight: Spacing.sm + 4,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm + 4,
  },

  body: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { ...Typography.body, fontWeight: '600', flex: 1, marginRight: Spacing.sm, color: colors.text },
  nameInactive: { color: colors.textSecondary },

  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  badge: { paddingHorizontal: Spacing.sm + 2, paddingVertical: 3, borderRadius: BorderRadius.pill },
  badgeActive: { backgroundColor: colors.primary + '20' },
  badgeInactive: { backgroundColor: colors.textLight + '20' },
  badgeText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  badgeTextActive: { color: colors.primaryDark },
  badgeTextInactive: { color: colors.textLight },

  brand: { ...Typography.caption, marginTop: 2, color: colors.textLight },
  ingredients: { ...Typography.caption, marginTop: 4, color: colors.accent, fontStyle: 'italic' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: Spacing.sm },
  pill: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillWarning: { borderColor: colors.error + '50', backgroundColor: colors.error + '08' },
  pillText: { fontSize: 10, fontWeight: '500', color: colors.textSecondary },
  pillTextWarning: { color: colors.error },

  notes: { ...Typography.caption, marginTop: Spacing.sm, color: colors.textSecondary, fontStyle: 'italic' },
});

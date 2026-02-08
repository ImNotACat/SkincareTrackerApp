import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { CATEGORY_INFO, FREQUENCY_OPTIONS, TIME_OF_DAY_USAGE_OPTIONS } from '../constants/skincare';
import { formatDateForDisplay } from '../lib/dateUtils';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
  onStop?: (product: Product) => void;
  onRestart?: (product: Product) => void;
}

function getExpiryInfo(product: Product): { label: string; isWarning: boolean } | null {
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
  const category = CATEGORY_INFO[product.step_category];
  const frequency = FREQUENCY_OPTIONS.find((f) => f.value === product.times_per_week);
  const timeLabel = TIME_OF_DAY_USAGE_OPTIONS.find((t) => t.key === product.time_of_day)?.label;
  const isActive = !product.stopped_at;
  const expiry = getExpiryInfo(product);

  return (
    <TouchableOpacity
      style={[styles.container, !isActive && styles.containerInactive]}
      onPress={() => onPress(product)}
      activeOpacity={0.7}
    >
      {/* Thumbnail or icon */}
      {product.image_url ? (
        <Image source={{ uri: product.image_url }} style={styles.thumbnail} resizeMode="cover" />
      ) : (
        <View style={[styles.iconCircle, { backgroundColor: category.color + '18' }]}>
          <Ionicons name={category.icon as any} size={20} color={category.color} />
        </View>
      )}

      <View style={styles.body}>
        {/* Name + badge row */}
        <View style={styles.topRow}>
          <Text style={[styles.name, !isActive && styles.nameInactive]} numberOfLines={1}>
            {product.name}
          </Text>
          <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
              {isActive ? 'Active' : 'Stopped'}
            </Text>
          </View>
        </View>

        {/* Brand */}
        {product.brand && (
          <Text style={styles.brand} numberOfLines={1}>{product.brand}</Text>
        )}

        {/* Active ingredients preview */}
        {product.active_ingredients && (
          <Text style={styles.ingredients} numberOfLines={1}>
            {product.active_ingredients}
          </Text>
        )}

        {/* Meta pills */}
        <View style={styles.metaRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{category.label}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{frequency?.label || `${product.times_per_week}x/wk`}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{timeLabel}</Text>
          </View>
          {expiry && (
            <View style={[styles.pill, expiry.isWarning && styles.pillWarning]}>
              <Text style={[styles.pillText, expiry.isWarning && styles.pillTextWarning]}>
                {expiry.label}
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {product.notes && (
          <Text style={styles.notes} numberOfLines={1}>{product.notes}</Text>
        )}

        {/* Bottom row: dates + action */}
        <View style={styles.bottomRow}>
          <Text style={styles.dateText}>
            {formatDateForDisplay(product.started_at)}
            {product.stopped_at && `  —  ${formatDateForDisplay(product.stopped_at)}`}
          </Text>

          {isActive && onStop && (
            <TouchableOpacity onPress={() => onStop(product)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="pause-circle-outline" size={18} color={Colors.warning} />
            </TouchableOpacity>
          )}
          {!isActive && onRestart && (
            <TouchableOpacity onPress={() => onRestart(product)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="play-circle-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  containerInactive: { opacity: 0.55 },

  // Thumbnail
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceSecondary,
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
  name: { ...Typography.body, fontWeight: '600', flex: 1, marginRight: Spacing.sm },
  nameInactive: { color: Colors.textSecondary },

  badge: { paddingHorizontal: Spacing.sm + 2, paddingVertical: 3, borderRadius: BorderRadius.pill },
  badgeActive: { backgroundColor: Colors.primary + '20' },
  badgeInactive: { backgroundColor: Colors.textLight + '20' },
  badgeText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  badgeTextActive: { color: Colors.primaryDark },
  badgeTextInactive: { color: Colors.textLight },

  brand: { ...Typography.caption, marginTop: 2 },
  ingredients: { ...Typography.caption, marginTop: 4, color: Colors.accent, fontStyle: 'italic' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: Spacing.sm },
  pill: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillWarning: { borderColor: Colors.error + '50', backgroundColor: Colors.error + '08' },
  pillText: { fontSize: 10, fontWeight: '500', color: Colors.textSecondary },
  pillTextWarning: { color: Colors.error },

  notes: { ...Typography.caption, marginTop: Spacing.sm, color: Colors.textSecondary, fontStyle: 'italic' },

  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  dateText: { ...Typography.caption, fontSize: 11, flex: 1 },
});

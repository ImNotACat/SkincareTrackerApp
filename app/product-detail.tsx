import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useProducts } from '../src/hooks/useProducts';
import { CATEGORY_INFO, TIME_OF_DAY_USAGE_OPTIONS, DAYS_OF_WEEK } from '../src/constants/skincare';
import { ConflictWarnings } from '../src/components/ConflictWarnings';
import { formatDateShort } from '../src/lib/dateUtils';

export default function ProductDetailScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { products, getConflictsForProduct } = useProducts();
  const product = products.find((p) => p.id === productId);
  const productConflicts = product ? getConflictsForProduct(product.id) : [];

  function InfoRow({ label, value, icon }: { label: string; value?: string; icon?: string }) {
    if (!value) return null;
    return (
      <View style={styles.infoRow}>
        {icon && <Ionicons name={icon as any} size={16} color={colors.primary} style={{ marginRight: 8 }} />}
        <View style={{ flex: 1 }}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.notFound}>
        <Text style={[Typography.body, { color: colors.text }]}>Product not found</Text>
      </View>
    );
  }

  const category = CATEGORY_INFO[product.step_category];
  const timeLabel = TIME_OF_DAY_USAGE_OPTIONS.find((t) => t.key === product.time_of_day)?.label;

  // Build schedule label
  const scheduleLabel = (() => {
    const st = product.schedule_type;
    if (!st || st === 'weekly') {
      const days = product.schedule_days;
      if (!days || days.length === 0 || days.length === 7) return 'Daily';
      return days.map((d) => DAYS_OF_WEEK.find((dw) => dw.key === d)?.short || d).join(', ');
    }
    if (st === 'cycle') {
      const len = product.schedule_cycle_length;
      const active = product.schedule_cycle_days;
      if (len && active) return `${active.length} of ${len}-day cycle`;
      return 'Cycle';
    }
    if (st === 'interval') {
      const interval = product.schedule_interval_days;
      if (interval) return `Every ${interval} day${interval !== 1 ? 's' : ''}`;
      return 'Interval';
    }
    return 'Daily';
  })();

  // Expiry calculation
  let expiryLabel: string | null = null;
  if (product.date_opened && product.longevity_months) {
    const opened = new Date(product.date_opened + 'T00:00:00');
    const expiry = new Date(opened);
    expiry.setMonth(expiry.getMonth() + product.longevity_months);
    const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) {
      expiryLabel = `Expired ${Math.abs(daysLeft)} days ago`;
    } else {
      expiryLabel = `Expires ${formatDateShort(expiry.toISOString().split('T')[0])} (${daysLeft} days)`;
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero image */}
      {product.image_url ? (
        <Image source={{ uri: product.image_url }} style={styles.heroImage} resizeMode="cover" />
      ) : (
        <View style={[styles.heroPlaceholder, { backgroundColor: category.color + '15' }]}>
          <Ionicons name={category.icon as any} size={48} color={category.color} />
        </View>
      )}

      {/* Name & Brand */}
      <Text style={styles.productName}>{product.name}</Text>
      {product.brand && <Text style={styles.productBrand}>{product.brand}</Text>}

      {/* Status badge */}
      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, product.stopped_at ? styles.statusInactive : styles.statusActive]}>
          <Text style={[styles.statusText, product.stopped_at ? styles.statusTextInactive : styles.statusTextActive]}>
            {product.stopped_at ? 'Stopped' : 'Active'}
          </Text>
        </View>
        <View style={styles.categoryPill}>
          <Ionicons name={category.icon as any} size={14} color={category.color} />
          <Text style={[styles.categoryPillText, { color: category.color }]}>{category.label}</Text>
        </View>
      </View>

      {/* Ingredient Conflict Warnings */}
      {productConflicts.length > 0 && (
        <View style={{ paddingHorizontal: Spacing.md + 4 }}>
          <ConflictWarnings conflicts={productConflicts} />
        </View>
      )}

      {/* Quick info */}
      <View style={styles.card}>
        <InfoRow label="Schedule" value={scheduleLabel} icon="repeat-outline" />
        <InfoRow label="Time of Day" value={timeLabel} icon="time-outline" />
        {product.longevity_months && (
          <InfoRow label="Period After Opening" value={`${product.longevity_months} months`} icon="hourglass-outline" />
        )}
        {expiryLabel && (
          <InfoRow label="Expiry" value={expiryLabel} icon="calendar-outline" />
        )}
      </View>

      {/* Dates */}
      <View style={styles.card}>
        <InfoRow label="Added to Routine" value={formatDateShort(product.started_at)} icon="add-circle-outline" />
        {product.date_purchased && <InfoRow label="Purchased" value={formatDateShort(product.date_purchased)} icon="cart-outline" />}
        {product.date_opened && <InfoRow label="Opened" value={formatDateShort(product.date_opened)} icon="open-outline" />}
        {product.stopped_at && <InfoRow label="Stopped" value={formatDateShort(product.stopped_at)} icon="close-circle-outline" />}
      </View>

      {/* Active Ingredients */}
      {product.active_ingredients && (
        <>
          <Text style={styles.sectionTitle}>Active Ingredients</Text>
          <View style={styles.card}>
            <Text style={styles.ingredientText}>{product.active_ingredients}</Text>
          </View>
        </>
      )}

      {/* Full Ingredients */}
      {product.full_ingredients && (
        <>
          <Text style={styles.sectionTitle}>Full Ingredients (INCI)</Text>
          <View style={styles.card}>
            <Text style={styles.ingredientTextFull}>{product.full_ingredients}</Text>
          </View>
        </>
      )}

      {/* Notes */}
      {product.notes && (
        <>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.card}>
            <Text style={styles.notesText}>{product.notes}</Text>
          </View>
        </>
      )}

      {/* Source URL */}
      {product.source_url && (
        <TouchableOpacity
          style={styles.sourceLink}
          onPress={() => Linking.openURL(product.source_url!)}
        >
          <Ionicons name="link-outline" size={16} color={colors.primary} />
          <Text style={styles.sourceLinkText} numberOfLines={1}>View original product page</Text>
          <Ionicons name="open-outline" size={14} color={colors.textLight} />
        </TouchableOpacity>
      )}

      {/* Edit button */}
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => router.push({ pathname: '/edit-product', params: { productId: product.id } })}
        activeOpacity={0.85}
      >
        <Ionicons name="create-outline" size={18} color={colors.textOnPrimary} />
        <Text style={styles.editButtonText}>Edit Product</Text>
      </TouchableOpacity>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: Spacing.xxl },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  heroImage: { width: '100%', height: 240, backgroundColor: colors.surfaceSecondary },
  heroPlaceholder: { width: '100%', height: 180, alignItems: 'center', justifyContent: 'center' },

  productName: { ...Typography.title, color: colors.text, fontSize: 24, paddingHorizontal: Spacing.md + 4, marginTop: Spacing.md },
  productBrand: { ...Typography.bodySmall, color: colors.textSecondary, paddingHorizontal: Spacing.md + 4, marginTop: Spacing.xs },

  statusRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md + 4, marginTop: Spacing.sm, gap: Spacing.sm },
  statusBadge: { paddingHorizontal: Spacing.sm + 4, paddingVertical: 4, borderRadius: BorderRadius.pill },
  statusActive: { backgroundColor: colors.primary + '20' },
  statusInactive: { backgroundColor: colors.textLight + '20' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusTextActive: { color: colors.primaryDark },
  statusTextInactive: { color: colors.textLight },
  categoryPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm + 4, paddingVertical: 4, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: colors.border, gap: 4 },
  categoryPillText: { fontSize: 12, fontWeight: '500' },

  // Cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.md + 4,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { ...Typography.label, color: colors.textSecondary, paddingHorizontal: Spacing.md + 4, marginTop: Spacing.lg, marginBottom: 2 },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: Spacing.sm },
  infoLabel: { ...Typography.caption, color: colors.textLight, fontSize: 11, marginBottom: 2 },
  infoValue: { ...Typography.body, color: colors.text, fontSize: 14 },

  ingredientText: { ...Typography.body, fontSize: 14, lineHeight: 22, color: colors.accent },
  ingredientTextFull: { ...Typography.bodySmall, fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  notesText: { ...Typography.body, fontSize: 14, lineHeight: 22, fontStyle: 'italic', color: colors.textSecondary },

  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md + 4,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: Spacing.sm,
  },
  sourceLinkText: { ...Typography.bodySmall, flex: 1, color: colors.primary },

  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md + 4,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  editButtonText: { ...Typography.button, color: colors.textOnPrimary },
});

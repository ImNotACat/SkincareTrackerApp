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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useProductPreview } from '../src/contexts/ProductPreviewContext';
import { CATEGORY_INFO } from '../src/constants/skincare';

export default function ProductPreviewScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { previewProduct } = useProductPreview();

  if (!previewProduct) {
    return (
      <View style={styles.notFound}>
        <Text style={[Typography.body, { color: colors.text }]}>No product to display</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const category = CATEGORY_INFO[previewProduct.step_category ?? 'other'];
  const ingredients = previewProduct.ingredients?.trim();
  const activeList = previewProduct.active_ingredients?.length
    ? previewProduct.active_ingredients.join(', ')
    : undefined;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {previewProduct.image_url ? (
        <Image source={{ uri: previewProduct.image_url }} style={styles.heroImage} resizeMode="cover" />
      ) : (
        <View style={[styles.heroPlaceholder, { backgroundColor: category.color + '15' }]}>
          <Ionicons name={category.icon as any} size={48} color={category.color} />
        </View>
      )}

      <Text style={styles.productName}>{previewProduct.name}</Text>
      {(previewProduct.brand || previewProduct.size) && (
        <Text style={styles.productBrand}>
          {[previewProduct.brand, previewProduct.size].filter(Boolean).join(' · ')}
        </Text>
      )}

      <View style={styles.statusRow}>
        <View style={[styles.categoryPill, { borderColor: category.color }]}>
          <Ionicons name={category.icon as any} size={14} color={category.color} />
          <Text style={[styles.categoryPillText, { color: category.color }]}>{category.label}</Text>
        </View>
      </View>

      {activeList && (
        <>
          <Text style={styles.sectionTitle}>Active Ingredients</Text>
          <View style={styles.card}>
            <Text style={styles.ingredientText}>{activeList}</Text>
          </View>
        </>
      )}

      {ingredients && (
        <>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          <View style={styles.card}>
            <Text style={styles.ingredientTextFull}>{ingredients}</Text>
          </View>
        </>
      )}

      {previewProduct.source_url && (
        <TouchableOpacity
          style={styles.sourceLink}
          onPress={() => Linking.openURL(previewProduct.source_url!)}
        >
          <Ionicons name="link-outline" size={16} color={colors.primary} />
          <Text style={styles.sourceLinkText} numberOfLines={1}>View original product page</Text>
          <Ionicons name="open-outline" size={14} color={colors.textLight} />
        </TouchableOpacity>
      )}

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: Spacing.xxl },
    notFound: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      padding: Spacing.lg,
    },
    backBtn: { marginTop: Spacing.md },
    backBtnText: { ...Typography.body, color: colors.primary, fontWeight: '600' },

    heroImage: { width: '100%', height: 240, backgroundColor: colors.surfaceSecondary },
    heroPlaceholder: { width: '100%', height: 180, alignItems: 'center', justifyContent: 'center' },

    productName: {
      ...Typography.title,
      color: colors.text,
      fontSize: 24,
      paddingHorizontal: Spacing.md + 4,
      marginTop: Spacing.md,
    },
    productBrand: {
      ...Typography.bodySmall,
      color: colors.textSecondary,
      paddingHorizontal: Spacing.md + 4,
      marginTop: Spacing.xs,
    },

    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md + 4,
      marginTop: Spacing.sm,
    },
    categoryPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.sm + 4,
      paddingVertical: 4,
      borderRadius: BorderRadius.pill,
      borderWidth: 1,
      gap: 4,
    },
    categoryPillText: { fontSize: 12, fontWeight: '500' },

    sectionTitle: {
      ...Typography.label,
      color: colors.textSecondary,
      paddingHorizontal: Spacing.md + 4,
      marginTop: Spacing.lg,
      marginBottom: 2,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      marginHorizontal: Spacing.md + 4,
      marginTop: Spacing.sm,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ingredientText: {
      ...Typography.body,
      fontSize: 14,
      lineHeight: 22,
      color: colors.accent,
    },
    ingredientTextFull: {
      ...Typography.bodySmall,
      fontSize: 13,
      lineHeight: 20,
      color: colors.textSecondary,
    },
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
  });

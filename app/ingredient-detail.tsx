import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useIngredientById } from '../src/hooks/useIngredientById';
import { useIngredientSearch } from '../src/hooks/useIngredientSearch';

function DetailBlock({
  title,
  content,
  icon,
  colors,
}: {
  title: string;
  content: string | null | undefined;
  icon: string;
  colors: Record<string, string>;
}) {
  if (!content || !content.trim()) return null;
  const styles = createStyles(colors);
  return (
    <View style={styles.block}>
      <View style={styles.blockHeader}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
        <Text style={styles.blockTitle}>{title}</Text>
      </View>
      <Text style={styles.blockText}>{content.trim()}</Text>
    </View>
  );
}

export default function IngredientDetailScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { ingredientId } = useLocalSearchParams<{ ingredientId?: string }>();
  const id = typeof ingredientId === 'string' ? ingredientId : undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const { ingredient, isLoading, error } = useIngredientById(id);
  const { results, isSearching } = useIngredientSearch(searchQuery);

  const showSearchResults = searchQuery.trim().length > 0;

  const openIngredient = (nextId: string) => {
    setSearchQuery('');
    router.setParams({ ingredientId: nextId });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
          placeholder="Search ingredients..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={12} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={20} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search results dropdown */}
      {showSearchResults && (
        <View style={[styles.resultsList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {isSearching ? (
            <View style={styles.resultPlaceholder}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : results.length === 0 ? (
            <View style={styles.resultPlaceholder}>
              <Text style={[styles.resultPlaceholderText, { color: colors.textLight }]}>No ingredients found</Text>
            </View>
          ) : (
            results.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.resultRow, { borderBottomColor: colors.divider }]}
                onPress={() => openIngredient(r.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>{r.name}</Text>
                {r.section ? (
                  <Text style={[styles.resultSection, { color: colors.textLight }]} numberOfLines={1}>{r.section}</Text>
                ) : null}
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {!id ? (
          <View style={styles.emptyState}>
            <Ionicons name="flask-outline" size={48} color={colors.textLight} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Ingredient details</Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              Search above or open an ingredient from the home discovery to view benefits, side effects, and more.
            </Text>
          </View>
        ) : isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyMessage, { color: colors.error }]}>{error}</Text>
          </View>
        ) : !ingredient ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>Ingredient not found.</Text>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.name}>{ingredient.name}</Text>
              {ingredient.section ? (
                <View style={[styles.sectionPill, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.sectionPillText, { color: colors.primary }]}>{ingredient.section}</Text>
                </View>
              ) : null}
            </View>

            <DetailBlock
              title="Description"
              content={ingredient.description}
              icon="document-text-outline"
              colors={colors}
            />
            <DetailBlock
              title="Benefits"
              content={ingredient.benefits}
              icon="sparkles-outline"
              colors={colors}
            />
            <DetailBlock
              title="Side effects"
              content={ingredient.side_effects}
              icon="warning-outline"
              colors={colors}
            />
            <DetailBlock
              title="Risky interactions"
              content={ingredient.risky_interactions}
              icon="alert-circle-outline"
              colors={colors}
            />

            <View style={styles.bottomSpacer} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: Record<string, string>) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    searchIcon: {
      position: 'absolute',
      left: Spacing.md + 20,
      zIndex: 1,
    },
    searchInput: {
      flex: 1,
      height: 40,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      paddingLeft: 40,
      paddingRight: 40,
      fontSize: 16,
    },
    clearBtn: {
      position: 'absolute',
      right: Spacing.md + 12,
    },
    resultsList: {
      maxHeight: 240,
      borderBottomWidth: 1,
      marginHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      overflow: 'hidden',
    },
    resultPlaceholder: {
      padding: Spacing.lg,
      alignItems: 'center',
    },
    resultPlaceholderText: {
      ...Typography.caption,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.sm + 4,
      paddingHorizontal: Spacing.md,
      borderBottomWidth: 1,
      gap: Spacing.sm,
    },
    resultName: {
      ...Typography.body,
      fontWeight: '500',
      flex: 1,
    },
    resultSection: {
      ...Typography.caption,
      fontSize: 12,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: Spacing.md,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: Spacing.xxl,
      paddingHorizontal: Spacing.lg,
    },
    emptyTitle: {
      ...Typography.subtitle,
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
    },
    emptyMessage: {
      ...Typography.bodySmall,
      textAlign: 'center',
    },
    loadingState: {
      paddingVertical: Spacing.xxl,
      alignItems: 'center',
    },
    header: {
      marginBottom: Spacing.lg,
    },
    name: {
      ...Typography.title,
      color: colors.text,
      fontSize: 26,
      marginBottom: Spacing.sm,
    },
    sectionPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: Spacing.sm + 4,
      paddingVertical: 4,
      borderRadius: BorderRadius.pill,
    },
    sectionPillText: {
      ...Typography.caption,
      fontWeight: '600',
      fontSize: 12,
    },
    block: {
      marginBottom: Spacing.lg,
    },
    blockHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    blockTitle: {
      ...Typography.label,
      color: colors.text,
      fontSize: 14,
    },
    blockText: {
      ...Typography.body,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    bottomSpacer: {
      height: Spacing.xxl,
    },
  });

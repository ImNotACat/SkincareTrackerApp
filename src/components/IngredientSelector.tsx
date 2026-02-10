import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SectionList,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { INGREDIENT_SECTIONS, IngredientSection } from '../constants/skincare';

interface IngredientSelectorProps {
  selectedIngredients: string[];
  onSelectionChange: (ingredients: string[]) => void;
  /** When provided, use these sections (e.g. from DB). Otherwise use static INGREDIENT_SECTIONS. */
  ingredientSections?: IngredientSection[] | null;
}

export function IngredientSelector({
  selectedIngredients,
  onSelectionChange,
  ingredientSections,
}: IngredientSelectorProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const sections = ingredientSections && ingredientSections.length > 0 ? ingredientSections : INGREDIENT_SECTIONS;

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const query = searchQuery.toLowerCase();
    const result: IngredientSection[] = [];
    for (const section of sections) {
      const filtered = section.data.filter((item) =>
        item.toLowerCase().includes(query),
      );
      if (filtered.length > 0) {
        result.push({ title: section.title, data: filtered });
      }
    }
    return result;
  }, [searchQuery, sections]);

  const handleToggleIngredient = (ingredient: string) => {
    if (selectedIngredients.includes(ingredient)) {
      onSelectionChange(selectedIngredients.filter((i) => i !== ingredient));
    } else {
      onSelectionChange([...selectedIngredients, ingredient]);
    }
  };

  const handleRemoveIngredient = (ingredient: string) => {
    onSelectionChange(selectedIngredients.filter((i) => i !== ingredient));
  };

  const handleOpenModal = () => {
    setSearchQuery('');
    setIsModalOpen(true);
  };

  return (
    <View style={styles.container}>
      {/* Selected tags */}
      {selectedIngredients.length > 0 && (
        <View style={styles.tagsContainer}>
          {selectedIngredients.map((ingredient) => (
            <View key={ingredient} style={styles.tag}>
              <Text style={styles.tagText}>{ingredient}</Text>
              <TouchableOpacity
                onPress={() => handleRemoveIngredient(ingredient)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Open picker button */}
      <TouchableOpacity
        style={styles.inputContainer}
        onPress={handleOpenModal}
        activeOpacity={0.7}
      >
        <Ionicons name="search-outline" size={18} color={colors.textLight} style={styles.searchIcon} />
        <Text style={styles.inputPlaceholder}>
          {selectedIngredients.length > 0
            ? `${selectedIngredients.length} selected — tap to edit`
            : 'Search active ingredients...'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textLight} />
      </TouchableOpacity>

      {/* Full-screen modal picker */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Active Ingredients</Text>
            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setIsModalOpen(false)}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.modalSearchContainer}>
            <Ionicons name="search-outline" size={18} color={colors.textLight} />
            <TextInput
              style={styles.modalSearchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search ingredients..."
              placeholderTextColor={colors.textLight}
              autoFocus={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textLight} />
              </TouchableOpacity>
            )}
          </View>

          {/* Selected count */}
          {selectedIngredients.length > 0 && (
            <View style={styles.selectedBar}>
              <Text style={styles.selectedBarText}>
                {selectedIngredients.length} ingredient{selectedIngredients.length !== 1 ? 's' : ''} selected
              </Text>
              <TouchableOpacity onPress={() => onSelectionChange([])}>
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Ingredient list */}
          <SectionList
            sections={filteredSections}
            keyExtractor={(item) => item}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const isSelected = selectedIngredients.includes(item);
              return (
                <TouchableOpacity
                  style={styles.listItem}
                  onPress={() => handleToggleIngredient(item)}
                  activeOpacity={0.6}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />
                    )}
                  </View>
                  <Text style={[styles.listItemText, isSelected && styles.listItemTextSelected]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No ingredients found</Text>
              </View>
            }
            stickySectionHeadersEnabled
            contentContainerStyle={styles.listContent}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {},
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    gap: 4,
  },
  tagText: {
    ...Typography.caption,
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  inputPlaceholder: {
    ...Typography.body,
    flex: 1,
    color: colors.textLight,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: {
    ...Typography.subtitle,
    fontSize: 18,
    color: colors.text,
  },
  modalDoneBtn: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
  },
  modalDoneText: {
    ...Typography.button,
    fontSize: 16,
    color: colors.primary,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.md + 4,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm + 2 : Spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    gap: Spacing.sm,
  },
  modalSearchInput: {
    ...Typography.body,
    flex: 1,
    color: colors.text,
    padding: 0,
  },
  selectedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.sm,
    backgroundColor: colors.primary + '10',
  },
  selectedBarText: {
    ...Typography.caption,
    color: colors.primaryDark,
    fontWeight: '500',
  },
  clearAllText: {
    ...Typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  sectionHeader: {
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sectionHeaderText: {
    ...Typography.label,
    fontSize: 11,
    color: colors.textSecondary,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: Spacing.sm + 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  listItemText: {
    ...Typography.body,
    fontSize: 15,
    color: colors.text,
  },
  listItemTextSelected: {
    color: colors.primaryDark,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.caption,
    color: colors.textLight,
    fontSize: 14,
  },
});

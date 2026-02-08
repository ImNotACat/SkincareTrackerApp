import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { INGREDIENT_SECTIONS, IngredientSection } from '../constants/skincare';

interface IngredientSelectorProps {
  selectedIngredients: string[];
  onSelectionChange: (ingredients: string[]) => void;
}

export function IngredientSelector({
  selectedIngredients,
  onSelectionChange,
}: IngredientSelectorProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) {
      return INGREDIENT_SECTIONS;
    }
    const query = searchQuery.toLowerCase();
    const result: IngredientSection[] = [];
    for (const section of INGREDIENT_SECTIONS) {
      const filtered = section.data.filter((item) =>
        item.toLowerCase().includes(query),
      );
      if (filtered.length > 0) {
        result.push({ title: section.title, data: filtered });
      }
    }
    return result;
  }, [searchQuery]);

  const hasResults = filteredSections.some((s) => s.data.length > 0);

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

  return (
    <View style={styles.container}>
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

      <TouchableOpacity
        style={styles.inputContainer}
        onPress={() => setIsDropdownOpen(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="search-outline" size={18} color={colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search active ingredients..."
          placeholderTextColor={colors.textLight}
          onFocus={() => setIsDropdownOpen(true)}
          onBlur={() => {
            setTimeout(() => setIsDropdownOpen(false), 200);
          }}
        />
        <Ionicons
          name={isDropdownOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textLight}
        />
      </TouchableOpacity>

      {isDropdownOpen && (
        <View style={styles.dropdown}>
          {hasResults ? (
            <ScrollView
              style={styles.dropdownList}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {filteredSections.map((section) => (
                <View key={section.title}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>{section.title}</Text>
                  </View>
                  {section.data.map((item) => {
                    const isSelected = selectedIngredients.includes(item);
                    return (
                      <TouchableOpacity
                        key={item}
                        style={styles.dropdownItem}
                        onPress={() => handleToggleIngredient(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.dropdownItemLeft}>
                          <View
                            style={[
                              styles.checkbox,
                              isSelected && styles.checkboxSelected,
                            ]}
                          >
                            {isSelected && (
                              <Ionicons
                                name="checkmark"
                                size={14}
                                color={colors.textOnPrimary}
                              />
                            )}
                          </View>
                          <Text
                            style={[
                              styles.dropdownItemText,
                              isSelected && styles.dropdownItemTextSelected,
                            ]}
                          >
                            {item}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No ingredients found</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
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
  input: {
    ...Typography.body,
    flex: 1,
    padding: 0,
    color: colors.text,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: Spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 260,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    zIndex: 1000,
  },
  dropdownList: {
    maxHeight: 260,
  },
  sectionHeader: {
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sectionHeaderText: {
    ...Typography.label,
    fontSize: 10,
    color: colors.textSecondary,
  },
  dropdownItem: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dropdownItemText: {
    ...Typography.body,
    fontSize: 14,
    color: colors.text,
  },
  dropdownItemTextSelected: {
    color: colors.primaryDark,
    fontWeight: '500',
  },
  emptyState: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.caption,
    color: colors.textLight,
  },
});

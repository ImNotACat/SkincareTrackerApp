import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { ACTIVE_INGREDIENTS } from '../constants/skincare';

interface IngredientSelectorProps {
  selectedIngredients: string[];
  onSelectionChange: (ingredients: string[]) => void;
}

export function IngredientSelector({
  selectedIngredients,
  onSelectionChange,
}: IngredientSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredIngredients = useMemo(() => {
    if (!searchQuery.trim()) {
      return ACTIVE_INGREDIENTS;
    }
    const query = searchQuery.toLowerCase();
    return ACTIVE_INGREDIENTS.filter((ingredient) =>
      ingredient.toLowerCase().includes(query)
    );
  }, [searchQuery]);

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
      {/* Selected ingredients as tags */}
      {selectedIngredients.length > 0 && (
        <View style={styles.tagsContainer}>
          {selectedIngredients.map((ingredient) => (
            <View key={ingredient} style={styles.tag}>
              <Text style={styles.tagText}>{ingredient}</Text>
              <TouchableOpacity
                onPress={() => handleRemoveIngredient(ingredient)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Search input */}
      <TouchableOpacity
        style={styles.inputContainer}
        onPress={() => setIsDropdownOpen(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="search-outline" size={18} color={Colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search active ingredients..."
          placeholderTextColor={Colors.textLight}
          onFocus={() => setIsDropdownOpen(true)}
          onBlur={() => {
            // Delay closing to allow item selection
            setTimeout(() => setIsDropdownOpen(false), 200);
          }}
        />
        <Ionicons
          name={isDropdownOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.textLight}
        />
      </TouchableOpacity>

      {/* Dropdown list */}
      {isDropdownOpen && filteredIngredients.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={filteredIngredients}
            keyExtractor={(item) => item}
            style={styles.dropdownList}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = selectedIngredients.includes(item);
              return (
                <TouchableOpacity
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
                          color={Colors.textOnPrimary}
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
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No ingredients found</Text>
              </View>
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    gap: 4,
  },
  tagText: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
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
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 200,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    zIndex: 1000,
  },
  dropdownList: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
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
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dropdownItemText: {
    ...Typography.body,
    fontSize: 14,
  },
  dropdownItemTextSelected: {
    color: Colors.primaryDark,
    fontWeight: '500',
  },
  emptyState: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.caption,
    color: Colors.textLight,
  },
});

import React, { useState, useCallback } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { Typography, Spacing, BorderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface DateInputProps {
  /** ISO date string (YYYY-MM-DD) or empty string */
  value: string;
  /** Called with ISO date string (YYYY-MM-DD) or empty string */
  onChangeDate: (isoDate: string) => void;
  placeholder?: string;
}

/**
 * A date text input that lets users type dd-mm-yyyy with auto-dash insertion.
 * Stores/returns ISO (YYYY-MM-DD) format via onChangeDate.
 */
export function DateInput({ value, onChangeDate, placeholder = 'dd-mm-yyyy' }: DateInputProps) {
  const { colors } = useTheme();

  // Convert ISO to display format for initial value
  const isoToDisplay = (iso: string): string => {
    if (!iso) return '';
    const match = iso.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
      const [, year, month, day] = match;
      return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
    }
    return iso;
  };

  const [rawText, setRawText] = useState(isoToDisplay(value));
  const [isFocused, setIsFocused] = useState(false);

  // When the parent value changes and we're not focused, sync display
  React.useEffect(() => {
    if (!isFocused) {
      setRawText(isoToDisplay(value));
    }
  }, [value, isFocused]);

  const handleChangeText = useCallback((text: string) => {
    // Strip non-digit, non-dash characters
    let cleaned = text.replace(/[^\d-]/g, '');

    // Auto-insert dashes
    const digits = cleaned.replace(/-/g, '');
    if (digits.length <= 2) {
      cleaned = digits;
    } else if (digits.length <= 4) {
      cleaned = `${digits.slice(0, 2)}-${digits.slice(2)}`;
    } else {
      cleaned = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 8)}`;
    }

    setRawText(cleaned);

    // Try to parse complete date
    const parsed = cleaned.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (parsed) {
      const [, day, month, year] = parsed;
      const d = parseInt(day, 10);
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
        const date = new Date(y, m - 1, d);
        if (!isNaN(date.getTime()) && date.getDate() === d && date.getMonth() === m - 1) {
          onChangeDate(date.toISOString().split('T')[0]);
          return;
        }
      }
    }

    // If text is cleared, clear the value
    if (cleaned === '') {
      onChangeDate('');
    }
  }, [onChangeDate]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // On blur, if the text doesn't form a valid date, revert to stored value
    const parsed = rawText.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!parsed && rawText !== '') {
      setRawText(isoToDisplay(value));
    }
  }, [rawText, value]);

  return (
    <TextInput
      style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
      value={rawText}
      onChangeText={handleChangeText}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      placeholderTextColor={colors.textLight}
      keyboardType="number-pad"
      maxLength={10}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.body,
    borderWidth: 1,
  },
});

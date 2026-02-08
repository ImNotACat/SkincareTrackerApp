import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { DAYS_OF_WEEK } from '../constants/skincare';
import { formatDateDDMMYYYY, getTodayString } from '../lib/dateUtils';

interface WeekBarProps {
  selectedDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
}

export function WeekBar({ selectedDate, onDateSelect }: WeekBarProps) {
  const weekDates = useMemo(() => {
    const selected = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = selected.getDay();
    const startOfWeek = new Date(selected);
    startOfWeek.setDate(selected.getDate() - dayOfWeek); // Go to Sunday
    
    const dates: { date: Date; dateStr: string; dayName: string; dayNumber: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayIndex = date.getDay();
      dates.push({
        date,
        dateStr,
        dayName: DAYS_OF_WEEK[dayIndex === 0 ? 6 : dayIndex - 1].short,
        dayNumber: date.getDate(),
      });
    }
    return dates;
  }, [selectedDate]);

  const todayStr = getTodayString();
  const isToday = (dateStr: string) => dateStr === todayStr;
  const isSelected = (dateStr: string) => dateStr === selectedDate;

  return (
    <ScrollView
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scrollView}
    >
      {weekDates.map(({ dateStr, dayName, dayNumber }) => {
        const today = isToday(dateStr);
        const selected = isSelected(dateStr);
        
        return (
          <TouchableOpacity
            key={dateStr}
            style={[styles.dayButton, selected && styles.dayButtonSelected]}
            onPress={() => onDateSelect(dateStr)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayName, selected && styles.dayNameSelected]}>
              {dayName}
            </Text>
            <View
              style={[
                styles.dayCircle,
                today && styles.dayCircleToday,
                selected && styles.dayCircleSelected,
              ]}
            >
              <Text
                style={[
                  styles.dayNumber,
                  today && styles.dayNumberToday,
                  selected && styles.dayNumberSelected,
                ]}
              >
                {dayNumber}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    marginBottom: Spacing.md,
  },
  container: {
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  dayButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm + 2,
    minWidth: 50,
  },
  dayButtonSelected: {
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.md,
  },
  dayName: {
    ...Typography.caption,
    fontSize: 11,
    marginBottom: Spacing.xs,
    color: Colors.textSecondary,
  },
  dayNameSelected: {
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayCircleToday: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  dayCircleSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayNumber: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  dayNumberToday: {
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  dayNumberSelected: {
    color: Colors.textOnPrimary,
    fontWeight: '600',
  },
});

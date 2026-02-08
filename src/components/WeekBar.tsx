import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, BorderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { getTodayString } from '../lib/dateUtils';

const SCREEN_WIDTH = Dimensions.get('window').width;
const WEEKS_BEFORE = 12;
const WEEKS_AFTER = 12;
const INITIAL_INDEX = WEEKS_BEFORE;

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface WeekBarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type WeekData = {
  key: string;
  days: { dateStr: string; dayLabel: string; dayNumber: number }[];
};

function buildWeeks(): WeekData[] {
  const todayMonday = getMonday(new Date());
  const weeks: WeekData[] = [];

  for (let w = -WEEKS_BEFORE; w <= WEEKS_AFTER; w++) {
    const monday = new Date(todayMonday);
    monday.setDate(todayMonday.getDate() + w * 7);

    const days: WeekData['days'] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + d);
      days.push({
        dateStr: toDateStr(date),
        dayLabel: DAY_LABELS[d],
        dayNumber: date.getDate(),
      });
    }

    weeks.push({ key: `week-${toDateStr(monday)}`, days });
  }
  return weeks;
}

export function WeekBar({ selectedDate, onDateSelect }: WeekBarProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<WeekData>>(null);
  const weeks = useMemo(() => buildWeeks(), []);
  const todayStr = getTodayString();

  const [currentPage, setCurrentPage] = useState(INITIAL_INDEX);

  useEffect(() => {
    const targetIdx = weeks.findIndex((w) =>
      w.days.some((d) => d.dateStr === selectedDate),
    );
    if (targetIdx >= 0 && targetIdx !== currentPage) {
      flatListRef.current?.scrollToIndex({ index: targetIdx, animated: true });
      setCurrentPage(targetIdx);
    }
  }, [selectedDate]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setCurrentPage(page);
    },
    [],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    [],
  );

  const renderWeek = useCallback(
    ({ item }: { item: WeekData }) => (
      <View style={styles.weekPage}>
        {item.days.map(({ dateStr, dayLabel, dayNumber }) => {
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;

          return (
            <TouchableOpacity
              key={dateStr}
              style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
              onPress={() => onDateSelect(dateStr)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                {dayLabel}
              </Text>
              <View
                style={[
                  styles.dayCircle,
                  isToday && styles.dayCircleToday,
                  isSelected && styles.dayCircleSelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    isToday && styles.dayNumberToday,
                    isSelected && styles.dayNumberSelected,
                  ]}
                >
                  {dayNumber}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    ),
    [selectedDate, todayStr, onDateSelect, styles],
  );

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <FlatList
        ref={flatListRef}
        data={weeks}
        horizontal={true}
        pagingEnabled={true}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        renderItem={renderWeek}
        getItemLayout={getItemLayout}
        initialScrollIndex={INITIAL_INDEX}
        onMomentumScrollEnd={onMomentumScrollEnd}
        initialNumToRender={3}
        windowSize={5}
        maxToRenderPerBatch={3}
      />
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  weekPage: {
    width: SCREEN_WIDTH,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.xs,
  },
  dayButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: 2,
    minWidth: 42,
    borderRadius: BorderRadius.md,
  },
  dayButtonSelected: {
    backgroundColor: colors.primary + '12',
  },
  dayName: {
    ...Typography.caption,
    fontSize: 11,
    marginBottom: Spacing.xs,
    color: colors.textSecondary,
  },
  dayNameSelected: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 0,
  },
  dayCircleToday: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
  dayCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderWidth: 0,
  },
  dayNumber: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  dayNumberToday: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  dayNumberSelected: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
});

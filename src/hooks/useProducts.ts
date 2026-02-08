import type { Product, DayOfWeek, ScheduleType } from '../types';
import { useProductsContext } from '../contexts/ProductsContext';
export type { ProductsContextValue } from '../contexts/ProductsContext';

// ─── Product Schedule Matching ──────────────────────────────────────────────
// These are pure utility functions kept here so existing imports still work.

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Determine whether a product is scheduled for use on a given date.
 * Products without a schedule_type (or with schedule_type 'weekly' and all days)
 * are considered active every day.
 */
export function isProductActiveOnDate(product: Product, dateStr: string): boolean {
  // Stopped products are never active
  if (product.stopped_at) return false;

  const scheduleType: ScheduleType | undefined = product.schedule_type;

  // No scheduling set → treat as daily
  if (!scheduleType) return true;

  switch (scheduleType) {
    case 'weekly': {
      const scheduleDays = product.schedule_days;
      // No days array or all 7 days → every day
      if (!scheduleDays || scheduleDays.length === 0 || scheduleDays.length === 7) return true;
      const date = new Date(dateStr + 'T00:00:00');
      const dayNames: DayOfWeek[] = [
        'sunday', 'monday', 'tuesday', 'wednesday',
        'thursday', 'friday', 'saturday',
      ];
      const dayOfWeek = dayNames[date.getDay()];
      return scheduleDays.includes(dayOfWeek);
    }

    case 'cycle': {
      const cycleLength = product.schedule_cycle_length;
      const cycleDays = product.schedule_cycle_days;
      const startDate = product.schedule_cycle_start_date;
      if (!cycleLength || !cycleDays || !startDate) return true; // fallback to daily
      const elapsed = daysBetween(startDate, dateStr);
      if (elapsed < 0) return false;
      const cycleDay = (elapsed % cycleLength) + 1;
      return cycleDays.includes(cycleDay);
    }

    case 'interval': {
      const intervalDays = product.schedule_interval_days;
      const startDate = product.schedule_interval_start_date;
      if (!intervalDays || !startDate) return true; // fallback to daily
      const elapsed = daysBetween(startDate, dateStr);
      if (elapsed < 0) return false;
      return elapsed % intervalDays === 0;
    }

    default:
      return true;
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────
// Delegates to the shared ProductsContext so every screen sees the same state.

export function useProducts() {
  return useProductsContext();
}

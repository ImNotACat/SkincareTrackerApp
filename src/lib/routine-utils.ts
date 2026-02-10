import type { RoutineStep, DayOfWeek, ScheduleType } from '../types';

export function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Whether a routine step is active on the given date (YYYY-MM-DD).
 */
export function isStepActiveOnDate(step: RoutineStep, dateStr: string): boolean {
  const scheduleType: ScheduleType = step.schedule_type || 'weekly';

  switch (scheduleType) {
    case 'weekly': {
      const date = new Date(dateStr + 'T00:00:00');
      const dayNames: DayOfWeek[] = [
        'sunday', 'monday', 'tuesday', 'wednesday',
        'thursday', 'friday', 'saturday',
      ];
      const dayOfWeek = dayNames[date.getDay()];
      return (step.days || []).includes(dayOfWeek);
    }
    case 'cycle': {
      const cycleLength = step.cycle_length;
      const cycleDays = step.cycle_days;
      const startDate = step.cycle_start_date;
      if (!cycleLength || !cycleDays || !startDate) return false;
      const elapsed = daysBetween(startDate, dateStr);
      if (elapsed < 0) return false;
      const cycleDay = (elapsed % cycleLength) + 1;
      return cycleDays.includes(cycleDay);
    }
    case 'interval': {
      const intervalDays = step.interval_days;
      const startDate = step.interval_start_date;
      if (!intervalDays || !startDate) return false;
      const elapsed = daysBetween(startDate, dateStr);
      if (elapsed < 0) return false;
      return elapsed % intervalDays === 0;
    }
    default:
      return false;
  }
}

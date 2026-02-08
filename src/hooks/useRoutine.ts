import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  RoutineStep, CompletedStep, DayOfWeek, TodayStep,
  TimeOfDay, ScheduleType, StepCompletionStatus,
} from '../types';
import { DEFAULT_ROUTINE_TEMPLATE, ALL_DAYS } from '../constants/skincare';

// ─── Storage Keys ───────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  ROUTINE_STEPS: '@glow/routine_steps',
  COMPLETED_STEPS: '@glow/completed_steps',
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

// ─── Schedule Matching ──────────────────────────────────────────────────────

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function isStepActiveOnDate(step: RoutineStep, dateStr: string): boolean {
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

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useRoutine() {
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stepsJson, completedJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ROUTINE_STEPS),
        AsyncStorage.getItem(STORAGE_KEYS.COMPLETED_STEPS),
      ]);

      if (stepsJson) {
        const parsed: RoutineStep[] = JSON.parse(stepsJson);
        const migrated = parsed.map((s) => ({
          ...s,
          schedule_type: s.schedule_type || ('weekly' as ScheduleType),
        }));
        setSteps(migrated);
      } else {
        const defaultSteps = DEFAULT_ROUTINE_TEMPLATE.map((template, index) => ({
          id: generateId() + index,
          user_id: 'local',
          name: template.name!,
          category: template.category!,
          time_of_day: template.time_of_day!,
          schedule_type: (template.schedule_type || 'weekly') as ScheduleType,
          days: template.days || ALL_DAYS,
          order: index,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })) as RoutineStep[];
        setSteps(defaultSteps);
        await AsyncStorage.setItem(STORAGE_KEYS.ROUTINE_STEPS, JSON.stringify(defaultSteps));
      }

      if (completedJson) {
        // Migrate old completed steps that don't have status
        const parsed: CompletedStep[] = JSON.parse(completedJson);
        const migrated = parsed.map((cs) => ({
          ...cs,
          status: cs.status || ('completed' as StepCompletionStatus),
        }));
        setCompletedSteps(migrated);
      }
    } catch (error) {
      console.error('Failed to load routine data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSteps = useCallback(async (newSteps: RoutineStep[]) => {
    setSteps(newSteps);
    await AsyncStorage.setItem(STORAGE_KEYS.ROUTINE_STEPS, JSON.stringify(newSteps));
  }, []);

  const saveCompleted = useCallback(async (newCompleted: CompletedStep[]) => {
    setCompletedSteps(newCompleted);
    await AsyncStorage.setItem(STORAGE_KEYS.COMPLETED_STEPS, JSON.stringify(newCompleted));
  }, []);

  // ── Today's Steps ───────────────────────────────────────────────────────

  const getTodaySteps = useCallback(
    (timeOfDay?: TimeOfDay, date?: string): TodayStep[] => {
      const targetDate = date || getDateString();

      return steps
        .filter((step) => {
          const matchesTime = timeOfDay ? step.time_of_day === timeOfDay : true;
          return matchesTime && isStepActiveOnDate(step, targetDate);
        })
        .sort((a, b) => a.order - b.order)
        .map((step) => {
          const record = completedSteps.find(
            (cs) => cs.step_id === step.id && cs.date === targetDate,
          );
          return {
            ...step,
            isCompleted: record?.status === 'completed',
            isSkipped: record?.status === 'skipped',
            productUsed: record?.product_used,
          };
        });
    },
    [steps, completedSteps],
  );

  // ── Step Actions ────────────────────────────────────────────────────────

  /**
   * Mark a step as completed, optionally recording which product was used.
   * If already completed, removes the completion (un-checks it).
   */
  const toggleStepCompletion = useCallback(
    async (stepId: string, productUsed?: string) => {
      const todayDate = getDateString();
      const existing = completedSteps.find(
        (cs) => cs.step_id === stepId && cs.date === todayDate,
      );

      let newCompleted: CompletedStep[];
      if (existing && existing.status === 'completed') {
        // Un-check: remove the record
        newCompleted = completedSteps.filter((cs) => cs.id !== existing.id);
      } else {
        // Mark as completed (replacing any existing skip)
        const withoutExisting = existing
          ? completedSteps.filter((cs) => cs.id !== existing.id)
          : completedSteps;
        newCompleted = [
          ...withoutExisting,
          {
            id: generateId(),
            user_id: 'local',
            step_id: stepId,
            status: 'completed' as StepCompletionStatus,
            product_used: productUsed,
            completed_at: new Date().toISOString(),
            date: todayDate,
          },
        ];
      }
      await saveCompleted(newCompleted);
    },
    [completedSteps, saveCompleted],
  );

  /**
   * Mark a step as skipped for today.
   * If already skipped, removes the skip (un-skips it).
   */
  const skipStep = useCallback(
    async (stepId: string) => {
      const todayDate = getDateString();
      const existing = completedSteps.find(
        (cs) => cs.step_id === stepId && cs.date === todayDate,
      );

      let newCompleted: CompletedStep[];
      if (existing && existing.status === 'skipped') {
        // Un-skip: remove the record
        newCompleted = completedSteps.filter((cs) => cs.id !== existing.id);
      } else {
        // Mark as skipped (replacing any existing completion)
        const withoutExisting = existing
          ? completedSteps.filter((cs) => cs.id !== existing.id)
          : completedSteps;
        newCompleted = [
          ...withoutExisting,
          {
            id: generateId(),
            user_id: 'local',
            step_id: stepId,
            status: 'skipped' as StepCompletionStatus,
            completed_at: new Date().toISOString(),
            date: todayDate,
          },
        ];
      }
      await saveCompleted(newCompleted);
    },
    [completedSteps, saveCompleted],
  );

  /**
   * Finish the routine for a given time of day: any steps that haven't been
   * actioned yet get marked as skipped. Returns the count of newly skipped.
   */
  const finishRoutine = useCallback(
    async (timeOfDay: TimeOfDay): Promise<number> => {
      const todayDate = getDateString();
      const todaySteps = getTodaySteps(timeOfDay);
      const unactioned = todaySteps.filter((s) => !s.isCompleted && !s.isSkipped);

      if (unactioned.length === 0) return 0;

      const newRecords: CompletedStep[] = unactioned.map((step) => ({
        id: generateId(),
        user_id: 'local',
        step_id: step.id,
        status: 'skipped' as StepCompletionStatus,
        completed_at: new Date().toISOString(),
        date: todayDate,
      }));

      await saveCompleted([...completedSteps, ...newRecords]);
      return unactioned.length;
    },
    [completedSteps, saveCompleted, getTodaySteps],
  );

  // ── CRUD Operations ───────────────────────────────────────────────────

  const addStep = useCallback(
    async (step: Omit<RoutineStep, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const newStep: RoutineStep = {
        ...step,
        id: generateId(),
        user_id: 'local',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await saveSteps([...steps, newStep]);
      return newStep;
    },
    [steps, saveSteps],
  );

  const updateStep = useCallback(
    async (id: string, updates: Partial<RoutineStep>) => {
      const newSteps = steps.map((step) =>
        step.id === id
          ? { ...step, ...updates, updated_at: new Date().toISOString() }
          : step,
      );
      await saveSteps(newSteps);
    },
    [steps, saveSteps],
  );

  const deleteStep = useCallback(
    async (id: string) => {
      await saveSteps(steps.filter((step) => step.id !== id));
      await saveCompleted(completedSteps.filter((cs) => cs.step_id !== id));
    },
    [steps, completedSteps, saveSteps, saveCompleted],
  );

  const reorderSteps = useCallback(
    async (reorderedSteps: RoutineStep[]) => {
      const updated = reorderedSteps.map((step, index) => ({
        ...step,
        order: index,
        updated_at: new Date().toISOString(),
      }));
      await saveSteps(updated);
    },
    [saveSteps],
  );

  // ── Progress ──────────────────────────────────────────────────────────

  const getTodayProgress = useCallback((): { completed: number; total: number } => {
    const todaySteps = getTodaySteps();
    return {
      completed: todaySteps.filter((s) => s.isCompleted).length,
      total: todaySteps.length,
    };
  }, [getTodaySteps]);

  return {
    steps,
    completedSteps,
    isLoading,
    getTodaySteps,
    toggleStepCompletion,
    skipStep,
    finishRoutine,
    addStep,
    updateStep,
    deleteStep,
    reorderSteps,
    getTodayProgress,
    reload: loadData,
  };
}

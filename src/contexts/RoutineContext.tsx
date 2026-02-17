import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useProducts } from '../hooks/useProducts';
import { supabase } from '../lib/supabase';
import { Tables } from '../lib/supabase';
import type {
  RoutineStep,
  CompletedStep,
  DayOfWeek,
  TodayStep,
  TimeOfDay,
  ScheduleType,
  StepCompletionStatus,
} from '../types';
import { DEFAULT_ROUTINE_TEMPLATE, ALL_DAYS } from '../constants/skincare';
import { isStepActiveOnDate } from '../lib/routine-utils';

// ─── Storage Keys ───────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  ROUTINE_STEPS: '@glow/routine_steps',
  COMPLETED_STEPS: '@glow/completed_steps',
} as const;

// ─── Helpers ───────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function rowToStep(row: Record<string, unknown>): RoutineStep {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    product_id: row.product_id != null ? String(row.product_id) : undefined,
    name: String(row.name),
    product_name: row.product_name != null ? String(row.product_name) : undefined,
    category: row.category as RoutineStep['category'],
    time_of_day: row.time_of_day as TimeOfDay,
    order: Number(row.order),
    notes: row.notes != null ? String(row.notes) : undefined,
    schedule_type: (row.schedule_type as ScheduleType) || 'weekly',
    days: Array.isArray(row.days) ? (row.days as DayOfWeek[]) : ALL_DAYS,
    cycle_length: row.cycle_length != null ? Number(row.cycle_length) : undefined,
    cycle_days: Array.isArray(row.cycle_days) ? (row.cycle_days as number[]) : undefined,
    cycle_start_date: row.cycle_start_date != null ? String(row.cycle_start_date) : undefined,
    interval_days: row.interval_days != null ? Number(row.interval_days) : undefined,
    interval_start_date: row.interval_start_date != null ? String(row.interval_start_date) : undefined,
    created_at: new Date(row.created_at as string).toISOString(),
    updated_at: new Date(row.updated_at as string).toISOString(),
  };
}

function rowToCompleted(row: Record<string, unknown>): CompletedStep {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    step_id: String(row.step_id),
    status: row.status as StepCompletionStatus,
    product_used: row.product_used != null ? String(row.product_used) : undefined,
    completed_at: new Date(row.completed_at as string).toISOString(),
    date: String(row.date),
  };
}

function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

// ─── Context type ───────────────────────────────────────────────────────────

export interface RoutineContextValue {
  steps: RoutineStep[];
  completedSteps: CompletedStep[];
  isLoading: boolean;
  getTodaySteps: (timeOfDay?: TimeOfDay, date?: string) => TodayStep[];
  toggleStepCompletion: (stepId: string, productUsed?: string) => Promise<void>;
  skipStep: (stepId: string) => Promise<void>;
  finishRoutine: (timeOfDay: TimeOfDay) => Promise<number>;
  addStep: (step: Omit<RoutineStep, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<RoutineStep>;
  updateStep: (id: string, updates: Partial<RoutineStep>) => Promise<void>;
  deleteStep: (id: string) => Promise<void>;
  reorderSteps: (reorderedSteps: RoutineStep[]) => void;
  getTodayProgress: () => { completed: number; total: number };
  reload: () => Promise<void>;
}

const RoutineContext = createContext<RoutineContextValue | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

export function RoutineProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { restartProduct, stopProduct, reload: reloadProducts } = useProducts();
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const stepsRef = useRef<RoutineStep[]>(steps);
  const reorderDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  const ensureProductActive = useCallback(
    (productId: string | undefined) => {
      if (!productId) return;
      restartProduct(productId)
        .then(() => reloadProducts())
        .catch((e) => console.warn('restartProduct failed:', e));
    },
    [restartProduct, reloadProducts],
  );

  const moveToShelfIfUnused = useCallback(
    (currentSteps: RoutineStep[], productId: string | undefined) => {
      if (!productId) return;
      const stillUsed = currentSteps.some((s) => s.product_id === productId);
      if (!stillUsed) {
        stopProduct(productId)
          .then(() => reloadProducts())
          .catch((e) => console.warn('stopProduct failed:', e));
      }
    },
    [stopProduct, reloadProducts],
  );

  const loadData = useCallback(async () => {
    try {
      if (user?.id) {
        const [stepsRes, completedRes] = await Promise.all([
          supabase.from(Tables.ROUTINE_STEPS).select('*').eq('user_id', user.id).order('order', { ascending: true }),
          supabase.from(Tables.COMPLETED_STEPS).select('*').eq('user_id', user.id),
        ]);
        if (stepsRes.error) {
          console.error('Failed to load routine steps:', stepsRes.error);
          setSteps([]);
        } else {
          setSteps((stepsRes.data || []).map((row) => rowToStep(row)));
        }
        if (completedRes.error) {
          console.error('Failed to load completed steps:', completedRes.error);
          setCompletedSteps([]);
        } else {
          setCompletedSteps((completedRes.data || []).map((row) => rowToCompleted(row)));
        }
      } else {
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
          const parsed: CompletedStep[] = JSON.parse(completedJson);
          const migrated = parsed.map((cs) => ({
            ...cs,
            status: cs.status || ('completed' as StepCompletionStatus),
          }));
          setCompletedSteps(migrated);
        }
      }
    } catch (error) {
      console.error('Failed to load routine data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveSteps = useCallback(async (newSteps: RoutineStep[]) => {
    setSteps(newSteps);
    if (!user?.id) {
      await AsyncStorage.setItem(STORAGE_KEYS.ROUTINE_STEPS, JSON.stringify(newSteps));
    }
  }, [user?.id]);

  const saveCompleted = useCallback(async (newCompleted: CompletedStep[]) => {
    setCompletedSteps(newCompleted);
    if (!user?.id) {
      await AsyncStorage.setItem(STORAGE_KEYS.COMPLETED_STEPS, JSON.stringify(newCompleted));
    }
  }, [user?.id]);

  const getTodaySteps = useCallback(
    (timeOfDay?: TimeOfDay, date?: string): TodayStep[] => {
      const targetDate = date || getDateString();
      return steps
        .filter((step) => {
          const matchesTime = timeOfDay
            ? step.time_of_day === timeOfDay || step.time_of_day === 'both'
            : true;
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

  const toggleStepCompletion = useCallback(
    async (stepId: string, productUsed?: string) => {
      const todayDate = getDateString();
      const existing = completedSteps.find(
        (cs) => cs.step_id === stepId && cs.date === todayDate,
      );
      if (user?.id) {
        await supabase
          .from(Tables.COMPLETED_STEPS)
          .delete()
          .eq('user_id', user.id)
          .eq('step_id', stepId)
          .eq('date', todayDate);
        if (!existing || existing.status !== 'completed') {
          await supabase.from(Tables.COMPLETED_STEPS).insert({
            user_id: user.id,
            step_id: stepId,
            status: 'completed',
            product_used: productUsed ?? null,
            date: todayDate,
          });
        }
      }
      let newCompleted: CompletedStep[];
      if (existing && existing.status === 'completed') {
        newCompleted = completedSteps.filter((cs) => cs.id !== existing.id);
      } else {
        const withoutExisting = existing
          ? completedSteps.filter((cs) => cs.id !== existing.id)
          : completedSteps;
        newCompleted = [
          ...withoutExisting,
          {
            id: generateId(),
            user_id: user?.id ?? 'local',
            step_id: stepId,
            status: 'completed' as StepCompletionStatus,
            product_used: productUsed,
            completed_at: new Date().toISOString(),
            date: todayDate,
          },
        ];
      }
      setCompletedSteps(newCompleted);
      if (!user?.id) await AsyncStorage.setItem(STORAGE_KEYS.COMPLETED_STEPS, JSON.stringify(newCompleted));
    },
    [user?.id, completedSteps],
  );

  const skipStep = useCallback(
    async (stepId: string) => {
      const todayDate = getDateString();
      const existing = completedSteps.find(
        (cs) => cs.step_id === stepId && cs.date === todayDate,
      );
      if (user?.id) {
        await supabase
          .from(Tables.COMPLETED_STEPS)
          .delete()
          .eq('user_id', user.id)
          .eq('step_id', stepId)
          .eq('date', todayDate);
        if (!existing || existing.status !== 'skipped') {
          await supabase.from(Tables.COMPLETED_STEPS).insert({
            user_id: user.id,
            step_id: stepId,
            status: 'skipped',
            product_used: null,
            date: todayDate,
          });
        }
      }
      let newCompleted: CompletedStep[];
      if (existing && existing.status === 'skipped') {
        newCompleted = completedSteps.filter((cs) => cs.id !== existing.id);
      } else {
        const withoutExisting = existing
          ? completedSteps.filter((cs) => cs.id !== existing.id)
          : completedSteps;
        newCompleted = [
          ...withoutExisting,
          {
            id: generateId(),
            user_id: user?.id ?? 'local',
            step_id: stepId,
            status: 'skipped' as StepCompletionStatus,
            completed_at: new Date().toISOString(),
            date: todayDate,
          },
        ];
      }
      setCompletedSteps(newCompleted);
      if (!user?.id) await AsyncStorage.setItem(STORAGE_KEYS.COMPLETED_STEPS, JSON.stringify(newCompleted));
    },
    [user?.id, completedSteps],
  );

  const finishRoutine = useCallback(
    async (timeOfDay: TimeOfDay): Promise<number> => {
      const todayDate = getDateString();
      const todaySteps = getTodaySteps(timeOfDay);
      const unactioned = todaySteps.filter((s) => !s.isCompleted && !s.isSkipped);
      if (unactioned.length === 0) return 0;
      if (user?.id) {
        await supabase.from(Tables.COMPLETED_STEPS).insert(
          unactioned.map((step) => ({
            user_id: user.id,
            step_id: step.id,
            status: 'skipped',
            product_used: null,
            date: todayDate,
          })),
        );
      }
      const newRecords: CompletedStep[] = unactioned.map((step) => ({
        id: generateId(),
        user_id: user?.id ?? 'local',
        step_id: step.id,
        status: 'skipped' as StepCompletionStatus,
        completed_at: new Date().toISOString(),
        date: todayDate,
      }));
      setCompletedSteps((prev) => [...prev, ...newRecords]);
      if (!user?.id) await AsyncStorage.setItem(STORAGE_KEYS.COMPLETED_STEPS, JSON.stringify([...completedSteps, ...newRecords]));
      return unactioned.length;
    },
    [user?.id, completedSteps, getTodaySteps],
  );

  const addStep = useCallback(
    async (step: Omit<RoutineStep, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (user?.id) {
        const { data, error } = await supabase
          .from(Tables.ROUTINE_STEPS)
          .insert({
            user_id: user.id,
            product_id: step.product_id ?? null,
            name: step.name,
            product_name: step.product_name ?? null,
            category: step.category,
            time_of_day: step.time_of_day,
            order: step.order,
            notes: step.notes ?? null,
            schedule_type: step.schedule_type,
            days: step.days,
            cycle_length: step.cycle_length ?? null,
            cycle_days: step.cycle_days ?? null,
            cycle_start_date: step.cycle_start_date ?? null,
            interval_days: step.interval_days ?? null,
            interval_start_date: step.interval_start_date ?? null,
          })
          .select()
          .single();
        if (error) {
          console.error('Failed to add routine step:', error);
          throw error;
        }
        const newStep = rowToStep(data);
        setSteps((prev) => [...prev, newStep]);
        ensureProductActive(step.product_id ?? undefined);
        return newStep;
      }
      const newStep: RoutineStep = {
        ...step,
        id: generateId(),
        user_id: 'local',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await saveSteps([...steps, newStep]);
      ensureProductActive(step.product_id ?? undefined);
      return newStep;
    },
    [user?.id, steps, saveSteps, ensureProductActive],
  );

  const updateStep = useCallback(
    async (id: string, updates: Partial<RoutineStep>) => {
      const currentStep = steps.find((s) => s.id === id);
      const previousProductId = currentStep?.product_id;
      const newProductId =
        updates.product_id === null || updates.product_id === undefined
          ? undefined
          : updates.product_id;

      if (user?.id) {
        const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (updates.product_id !== undefined) payload.product_id = updates.product_id ?? null;
        if (updates.name != null) payload.name = updates.name;
        if (updates.product_name !== undefined) payload.product_name = updates.product_name ?? null;
        if (updates.category != null) payload.category = updates.category;
        if (updates.time_of_day != null) payload.time_of_day = updates.time_of_day;
        if (updates.order != null) payload.order = updates.order;
        if (updates.notes !== undefined) payload.notes = updates.notes ?? null;
        if (updates.schedule_type != null) payload.schedule_type = updates.schedule_type;
        if (updates.days != null) payload.days = updates.days;
        if (updates.cycle_length !== undefined) payload.cycle_length = updates.cycle_length ?? null;
        if (updates.cycle_days !== undefined) payload.cycle_days = updates.cycle_days ?? null;
        if (updates.cycle_start_date !== undefined) payload.cycle_start_date = updates.cycle_start_date ?? null;
        if (updates.interval_days !== undefined) payload.interval_days = updates.interval_days ?? null;
        if (updates.interval_start_date !== undefined) payload.interval_start_date = updates.interval_start_date ?? null;
        const { error } = await supabase
          .from(Tables.ROUTINE_STEPS)
          .update(payload)
          .eq('id', id)
          .eq('user_id', user.id);
        if (error) {
          console.error('Failed to update routine step:', error);
          throw error;
        }
      }
      const newSteps = steps.map((step) =>
        step.id === id
          ? { ...step, ...updates, updated_at: new Date().toISOString() }
          : step,
      );
      setSteps(newSteps);

      if (typeof newProductId === 'string') {
        ensureProductActive(newProductId);
      }
      if (previousProductId && previousProductId !== newProductId) {
        moveToShelfIfUnused(newSteps, previousProductId);
      }

      if (!user?.id) await AsyncStorage.setItem(STORAGE_KEYS.ROUTINE_STEPS, JSON.stringify(newSteps));
    },
    [user?.id, steps, ensureProductActive, moveToShelfIfUnused],
  );

  const deleteStep = useCallback(
    async (id: string) => {
      const step = steps.find((s) => s.id === id);
      const productId = step?.product_id;

      if (user?.id) {
        await supabase.from(Tables.COMPLETED_STEPS).delete().eq('step_id', id).eq('user_id', user.id);
        const { error } = await supabase.from(Tables.ROUTINE_STEPS).delete().eq('id', id).eq('user_id', user.id);
        if (error) {
          console.error('Failed to delete routine step:', error);
          throw error;
        }
      }
      const newSteps = steps.filter((s) => s.id !== id);
      const newCompleted = completedSteps.filter((cs) => cs.step_id !== id);
      setSteps(newSteps);
      setCompletedSteps(newCompleted);

      moveToShelfIfUnused(newSteps, productId);

      if (!user?.id) {
        await AsyncStorage.setItem(STORAGE_KEYS.ROUTINE_STEPS, JSON.stringify(newSteps));
        await AsyncStorage.setItem(STORAGE_KEYS.COMPLETED_STEPS, JSON.stringify(newCompleted));
      }
    },
    [user?.id, steps, completedSteps, moveToShelfIfUnused],
  );

  const REORDER_DEBOUNCE_MS = 500;

  const persistStepsOrder = useCallback(
    async (stepsToPersist: RoutineStep[]) => {
      if (!user?.id) return;
      const now = new Date().toISOString();
      const results = await Promise.all(
        stepsToPersist.map((step, index) =>
          supabase
            .from(Tables.ROUTINE_STEPS)
            .update({ order: index, updated_at: now })
            .eq('id', step.id)
            .eq('user_id', user.id),
        ),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) {
        console.error('Failed to save step order:', failed.error);
      }
    },
    [user?.id],
  );

  const reorderSteps = useCallback(
    (reorderedSteps: RoutineStep[]) => {
      const updated = reorderedSteps.map((step, index) => ({
        ...step,
        order: index,
        updated_at: new Date().toISOString(),
      }));
      setSteps(updated);

      if (!user?.id) {
        AsyncStorage.setItem(STORAGE_KEYS.ROUTINE_STEPS, JSON.stringify(updated));
        return;
      }

      if (reorderDebounceRef.current != null) {
        clearTimeout(reorderDebounceRef.current);
      }
      reorderDebounceRef.current = setTimeout(() => {
        reorderDebounceRef.current = null;
        persistStepsOrder(stepsRef.current);
      }, REORDER_DEBOUNCE_MS);
    },
    [user?.id, persistStepsOrder],
  );

  useEffect(() => {
    return () => {
      if (reorderDebounceRef.current != null) {
        clearTimeout(reorderDebounceRef.current);
        reorderDebounceRef.current = null;
        persistStepsOrder(stepsRef.current);
      }
    };
  }, [persistStepsOrder]);

  const getTodayProgress = useCallback((): { completed: number; total: number } => {
    const todaySteps = getTodaySteps();
    return {
      completed: todaySteps.filter((s) => s.isCompleted).length,
      total: todaySteps.length,
    };
  }, [getTodaySteps]);

  const value: RoutineContextValue = {
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

  return (
    <RoutineContext.Provider value={value}>
      {children}
    </RoutineContext.Provider>
  );
}

export function useRoutineContext(): RoutineContextValue {
  const context = useContext(RoutineContext);
  if (!context) {
    throw new Error('useRoutineContext must be used within a RoutineProvider');
  }
  return context;
}

import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product, DayOfWeek, ScheduleType } from '../types';
import { detectConflicts, detectConflictsForProduct } from '../lib/ingredient-conflicts';
import type { DetectedConflict } from '../lib/ingredient-conflicts';

// ─── Storage Key ────────────────────────────────────────────────────────────

const STORAGE_KEY = '@glow/products';

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── Product Schedule Matching ──────────────────────────────────────────────

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

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from storage on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        // Migrate old products that used 'regular'/'rota' naming
        const parsed: Product[] = JSON.parse(json);
        const migrated = parsed.map((p) => {
          const st = p.schedule_type as any;
          if (st === 'regular') {
            return {
              ...p,
              schedule_type: 'interval' as ScheduleType,
              schedule_interval_start_date: (p as any).schedule_start_date,
            };
          }
          if (st === 'rota') {
            return {
              ...p,
              schedule_type: 'cycle' as ScheduleType,
              schedule_cycle_length: (p as any).schedule_rota_length,
              schedule_cycle_days: (p as any).schedule_rota_days,
              schedule_cycle_start_date: (p as any).schedule_rota_start_date,
            };
          }
          return p;
        });
        setProducts(migrated);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProducts = useCallback(async (updated: Product[]) => {
    setProducts(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  // ── Derived Lists ───────────────────────────────────────────────────────

  const activeProducts = useMemo(
    () =>
      products
        .filter((p) => !p.stopped_at)
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()),
    [products],
  );

  const inactiveProducts = useMemo(
    () =>
      products
        .filter((p) => !!p.stopped_at)
        .sort((a, b) => new Date(b.stopped_at!).getTime() - new Date(a.stopped_at!).getTime()),
    [products],
  );

  // ── Schedule-Aware Queries ─────────────────────────────────────────────

  /** Get active products scheduled for a given date */
  const getProductsForDate = useCallback(
    (dateStr: string): Product[] => {
      return activeProducts.filter((p) => isProductActiveOnDate(p, dateStr));
    },
    [activeProducts],
  );

  // ── CRUD ────────────────────────────────────────────────────────────────

  const addProduct = useCallback(
    async (
      product: Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    ) => {
      const newProduct: Product = {
        ...product,
        id: generateId(),
        user_id: 'local',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await saveProducts([...products, newProduct]);
      return newProduct;
    },
    [products, saveProducts],
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<Product>) => {
      const updated = products.map((p) =>
        p.id === id
          ? { ...p, ...updates, updated_at: new Date().toISOString() }
          : p,
      );
      await saveProducts(updated);
    },
    [products, saveProducts],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      await saveProducts(products.filter((p) => p.id !== id));
    },
    [products, saveProducts],
  );

  const stopProduct = useCallback(
    async (id: string) => {
      const today = new Date().toISOString().split('T')[0];
      await updateProduct(id, { stopped_at: today });
    },
    [updateProduct],
  );

  const restartProduct = useCallback(
    async (id: string) => {
      const today = new Date().toISOString().split('T')[0];
      await updateProduct(id, { stopped_at: undefined, started_at: today });
    },
    [updateProduct],
  );

  const getProductById = useCallback(
    (id: string): Product | undefined => products.find((p) => p.id === id),
    [products],
  );

  // ── Ingredient Conflicts ──────────────────────────────────────────────────

  /** All conflicts among active products */
  const allConflicts: DetectedConflict[] = useMemo(
    () => detectConflicts(products),
    [products],
  );

  /** Conflicts for a specific product against all others */
  const getConflictsForProduct = useCallback(
    (productId: string): DetectedConflict[] => {
      const product = products.find((p) => p.id === productId);
      if (!product) return [];
      return detectConflictsForProduct(product, products);
    },
    [products],
  );

  return {
    products,
    activeProducts,
    inactiveProducts,
    isLoading,
    addProduct,
    updateProduct,
    deleteProduct,
    stopProduct,
    restartProduct,
    getProductById,
    getProductsForDate,
    allConflicts,
    getConflictsForProduct,
    reload: loadData,
  };
}

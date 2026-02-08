import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { detectConflicts, detectConflictsForProduct } from '../lib/ingredient-conflicts';
import { isProductActiveOnDate } from '../hooks/useProducts';
import type { Product, ScheduleType } from '../types';
import type { DetectedConflict } from '../lib/ingredient-conflicts';

// ─── Storage Key ────────────────────────────────────────────────────────────

const STORAGE_KEY = '@glow/products';

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── Context Types ──────────────────────────────────────────────────────────

export interface ProductsContextValue {
  products: Product[];
  activeProducts: Product[];
  inactiveProducts: Product[];
  isLoading: boolean;
  addProduct: (
    product: Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
  ) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  stopProduct: (id: string) => Promise<void>;
  restartProduct: (id: string) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  getProductsForDate: (dateStr: string) => Product[];
  allConflicts: DetectedConflict[];
  getConflictsForProduct: (productId: string) => DetectedConflict[];
  reload: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextValue | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isGuest = !user || user.id === 'guest';

  // ── Load from AsyncStorage (guest / fallback) ──────────────────────────

  const loadFromAsyncStorage = useCallback(async () => {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (json) {
      const parsed: Product[] = JSON.parse(json);
      // Migrate old schedule naming
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
  }, []);

  // ── Load products ─────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      if (!isGuest && user) {
        // Authenticated user → load from Supabase
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to load products from Supabase:', error);
          // Fallback to local cache
          await loadFromAsyncStorage();
        } else {
          setProducts(data || []);
          // Cache locally for offline access
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data || []));
        }
      } else {
        // Guest → local only
        await loadFromAsyncStorage();
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isGuest, loadFromAsyncStorage]);

  // Wait for auth to settle, then load
  useEffect(() => {
    if (authLoading) return;
    loadData();
  }, [authLoading, loadData]);

  // ── Local cache helper ─────────────────────────────────────────────────

  const cacheProducts = useCallback(async (updated: Product[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  // ── Derived Lists ─────────────────────────────────────────────────────

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

  // ── Schedule-Aware Queries ────────────────────────────────────────────

  const getProductsForDate = useCallback(
    (dateStr: string): Product[] => {
      return activeProducts.filter((p) => isProductActiveOnDate(p, dateStr));
    },
    [activeProducts],
  );

  // ── CRUD ──────────────────────────────────────────────────────────────

  const addProduct = useCallback(
    async (
      product: Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    ): Promise<Product> => {
      if (!isGuest && user) {
        // Supabase insert (id, created_at, updated_at default on the server)
        const { data, error } = await supabase
          .from('products')
          .insert({ ...product, user_id: user.id })
          .select()
          .single();

        if (error) {
          console.error('Failed to save product to Supabase:', error);
          throw error;
        }

        const updated = [data as Product, ...products];
        setProducts(updated);
        await cacheProducts(updated);
        return data as Product;
      } else {
        // Guest: local only
        const now = new Date().toISOString();
        const newProduct: Product = {
          ...product,
          id: generateId(),
          user_id: 'local',
          created_at: now,
          updated_at: now,
        };
        const updated = [newProduct, ...products];
        setProducts(updated);
        await cacheProducts(updated);
        return newProduct;
      }
    },
    [products, user, isGuest, cacheProducts],
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<Product>) => {
      const now = new Date().toISOString();

      if (!isGuest && user) {
        const { error } = await supabase
          .from('products')
          .update({ ...updates, updated_at: now })
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Failed to update product in Supabase:', error);
          throw error;
        }
      }

      const updated = products.map((p) =>
        p.id === id ? { ...p, ...updates, updated_at: now } : p,
      );
      setProducts(updated);
      await cacheProducts(updated);
    },
    [products, user, isGuest, cacheProducts],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      if (!isGuest && user) {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Failed to delete product from Supabase:', error);
          throw error;
        }
      }

      const updated = products.filter((p) => p.id !== id);
      setProducts(updated);
      await cacheProducts(updated);
    },
    [products, user, isGuest, cacheProducts],
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

  // ── Ingredient Conflicts ──────────────────────────────────────────────

  const allConflicts: DetectedConflict[] = useMemo(
    () => detectConflicts(products),
    [products],
  );

  const getConflictsForProduct = useCallback(
    (productId: string): DetectedConflict[] => {
      const product = products.find((p) => p.id === productId);
      if (!product) return [];
      return detectConflictsForProduct(product, products);
    },
    [products],
  );

  // ── Context Value ─────────────────────────────────────────────────────

  const value = useMemo<ProductsContextValue>(
    () => ({
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
    }),
    [
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
      loadData,
    ],
  );

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useProductsContext(): ProductsContextValue {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProductsContext must be used within a ProductsProvider');
  }
  return context;
}

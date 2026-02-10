import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Tables } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { detectConflicts, detectConflictsForProduct } from '../lib/ingredient-conflicts';
import type { Product, ProductWithCatalog, CatalogProduct, RoutineStep } from '../types';
import type { DetectedConflict } from '../lib/ingredient-conflicts';
import { isStepActiveOnDate } from '../lib/routine-utils';

// ─── Storage Key ────────────────────────────────────────────────────────────

const STORAGE_KEY = '@glow/products';

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function mergeProductWithCatalog(p: Product, catalog: CatalogProduct | null): ProductWithCatalog {
  if (p.catalog_id && catalog) {
    return {
      ...p,
      name: catalog.name,
      brand: catalog.brand,
      image_url: catalog.image_url,
      step_category: catalog.step_category,
      active_ingredients: catalog.active_ingredients,
      full_ingredients: catalog.full_ingredients,
      size: catalog.size,
      source_url: catalog.source_url,
    };
  }
  return {
    ...p,
    name: p.name ?? '',
    brand: p.brand,
    image_url: p.image_url,
    step_category: (p.step_category ?? 'other') as import('../types').StepCategory,
    active_ingredients: undefined,
    full_ingredients: undefined,
    size: undefined,
    source_url: undefined,
  };
}

const ALL_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;

function mapRowToStep(row: Record<string, unknown>): RoutineStep {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    product_id: row.product_id != null ? String(row.product_id) : undefined,
    name: String(row.name),
    product_name: row.product_name != null ? String(row.product_name) : undefined,
    category: row.category as RoutineStep['category'],
    time_of_day: row.time_of_day as RoutineStep['time_of_day'],
    order: Number(row.order),
    notes: row.notes != null ? String(row.notes) : undefined,
    schedule_type: ((row.schedule_type as RoutineStep['schedule_type']) || 'weekly'),
    days: Array.isArray(row.days) ? (row.days as RoutineStep['days']) : [...ALL_DAYS],
    cycle_length: row.cycle_length != null ? Number(row.cycle_length) : undefined,
    cycle_days: Array.isArray(row.cycle_days) ? (row.cycle_days as number[]) : undefined,
    cycle_start_date: row.cycle_start_date != null ? String(row.cycle_start_date) : undefined,
    interval_days: row.interval_days != null ? Number(row.interval_days) : undefined,
    interval_start_date: row.interval_start_date != null ? String(row.interval_start_date) : undefined,
    created_at: new Date(row.created_at as string).toISOString(),
    updated_at: new Date(row.updated_at as string).toISOString(),
  };
}

// ─── Context Types ──────────────────────────────────────────────────────────

/** Payload when adding a product: catalog link or custom overrides + user fields. */
export type AddProductPayload = {
  catalog_id?: string;
  name?: string;
  brand?: string;
  image_url?: string;
  step_category?: import('../types').StepCategory;
  size?: string;
  source_url?: string;
  active_ingredients?: string;
  full_ingredients?: string;
  started_at: string;
  date_opened?: string;
  date_purchased?: string;
  longevity_months?: number;
  notes?: string;
};

export interface ProductsContextValue {
  products: ProductWithCatalog[];
  activeProducts: ProductWithCatalog[];
  inactiveProducts: ProductWithCatalog[];
  isLoading: boolean;
  addProduct: (product: AddProductPayload, existingCatalogId?: string) => Promise<ProductWithCatalog>;
  addProductFromCatalog: (catalogProduct: CatalogProduct) => Promise<ProductWithCatalog>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  stopProduct: (id: string) => Promise<void>;
  restartProduct: (id: string) => Promise<void>;
  getProductById: (id: string) => ProductWithCatalog | undefined;
  getProductsForDate: (dateStr: string) => ProductWithCatalog[];
  isProductInMyList: (catalogId: string) => boolean;
  allConflicts: DetectedConflict[];
  getConflictsForProduct: (productId: string) => DetectedConflict[];
  reload: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextValue | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [catalog, setCatalog] = useState<Map<string, CatalogProduct>>(new Map());
  const [routineSteps, setRoutineSteps] = useState<RoutineStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isGuest = !user || user.id === 'guest';

  // ── Load from AsyncStorage (guest / fallback) ──────────────────────────

  const loadFromAsyncStorage = useCallback(async () => {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (json) {
      try {
        const parsed: Product[] = JSON.parse(json);
        setProducts(parsed);
      } catch {
        // ignore invalid cache
      }
    }
  }, []);

  // ── Load products, catalog, and routine steps ─────────────────────────

  const loadData = useCallback(async () => {
    try {
      if (!isGuest && user) {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (productsError) {
          console.error('Failed to load products from Supabase:', productsError);
          await loadFromAsyncStorage();
          setCatalog(new Map());
          setRoutineSteps([]);
        } else {
          const rawProducts = (productsData || []) as Product[];
          setProducts(rawProducts);

          const catalogIds = [...new Set(rawProducts.map((p) => p.catalog_id).filter(Boolean) as string[])];
          if (catalogIds.length > 0) {
            const { data: catalogData } = await supabase
              .from('product_catalog')
              .select('*')
              .in('id', catalogIds);
            const catalogMap = new Map<string, CatalogProduct>();
            (catalogData || []).forEach((row) => {
              catalogMap.set(row.id, row as unknown as CatalogProduct);
            });
            setCatalog(catalogMap);
          } else {
            setCatalog(new Map());
          }

          const { data: stepsData } = await supabase
            .from('routine_steps')
            .select('*')
            .eq('user_id', user.id)
            .order('order', { ascending: true });
          setRoutineSteps((stepsData || []).map((row) => mapRowToStep(row as unknown as Record<string, unknown>)));

          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rawProducts));
        }
      } else {
        await loadFromAsyncStorage();
        setCatalog(new Map());
        setRoutineSteps([]);
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

  // ── Merged display list (product + catalog) ─────────────────────────────

  const productsWithCatalog = useMemo(() => {
    return products.map((p) => mergeProductWithCatalog(p, p.catalog_id ? catalog.get(p.catalog_id) ?? null : null));
  }, [products, catalog]);

  const activeProducts = useMemo(
    () =>
      productsWithCatalog
        .filter((p) => !p.stopped_at)
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()),
    [productsWithCatalog],
  );

  const inactiveProducts = useMemo(
    () =>
      productsWithCatalog
        .filter((p) => !!p.stopped_at)
        .sort((a, b) => new Date(b.stopped_at!).getTime() - new Date(a.stopped_at!).getTime()),
    [productsWithCatalog],
  );

  // ── Products for date (from routine steps) ─────────────────────────────

  const getProductsForDate = useCallback(
    (dateStr: string): ProductWithCatalog[] => {
      const productIds = new Set<string>();
      routineSteps.forEach((step) => {
        if (step.product_id && isStepActiveOnDate(step, dateStr)) {
          productIds.add(step.product_id);
        }
      });
      return activeProducts.filter((p) => productIds.has(p.id));
    },
    [activeProducts, routineSteps],
  );

  // ── CRUD ──────────────────────────────────────────────────────────────

  /** Push catalog-shaped data to product_catalog; returns catalog id or null. */
  const pushToCatalog = useCallback(
    async (payload: {
      name: string;
      brand?: string;
      size?: string;
      image_url?: string;
      source_url?: string;
      step_category: import('../types').StepCategory;
      active_ingredients?: string;
      full_ingredients?: string;
    }): Promise<string | null> => {
      if (isGuest || !user) return null;
      try {
        let query = supabase
          .from('product_catalog')
          .select('id, times_added')
          .ilike('name', payload.name.trim());
        if (payload.brand) {
          query = query.ilike('brand', payload.brand.trim());
        } else {
          query = query.is('brand', null);
        }
        const { data: existing } = await query.limit(1);
        if (existing && existing.length > 0) {
          const catalogEntry = existing[0];
          await supabase
            .from('product_catalog')
            .update({
              times_added: catalogEntry.times_added + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', catalogEntry.id);
          return catalogEntry.id;
        }
        const { data, error } = await supabase
          .from('product_catalog')
          .insert({
            name: payload.name.trim(),
            brand: payload.brand?.trim() || null,
            size: payload.size?.trim() || null,
            image_url: payload.image_url || null,
            source_url: payload.source_url || null,
            step_category: payload.step_category,
            active_ingredients: payload.active_ingredients || null,
            full_ingredients: payload.full_ingredients || null,
            created_by: user.id,
            times_added: 1,
          })
          .select('id')
          .single();
        if (error) {
          console.error('Failed to push to catalog:', error);
          return null;
        }
        return data?.id || null;
      } catch (err) {
        console.error('Catalog push error:', err);
        return null;
      }
    },
    [user, isGuest],
  );

  const addProduct = useCallback(
    async (payload: AddProductPayload, existingCatalogId?: string): Promise<ProductWithCatalog> => {
      const today = new Date().toISOString().split('T')[0];
      let catalogId = payload.catalog_id ?? existingCatalogId ?? null;

      if (!isGuest && user) {
        if (catalogId) {
          supabase
            .from('product_catalog')
            .select('times_added')
            .eq('id', catalogId)
            .single()
            .then(({ data }) => {
              if (data) {
                supabase
                  .from('product_catalog')
                  .update({
                    times_added: data.times_added + 1,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', catalogId!)
                  .then(() => {});
              }
            });
        } else if (payload.name) {
          catalogId = await pushToCatalog({
            name: payload.name,
            brand: payload.brand,
            size: payload.size,
            image_url: payload.image_url,
            source_url: payload.source_url,
            step_category: payload.step_category ?? 'other',
            active_ingredients: payload.active_ingredients,
            full_ingredients: payload.full_ingredients,
          });
          if (catalogId) {
            setCatalog((prev) => {
              const next = new Map(prev);
              next.set(catalogId!, {
                id: catalogId!,
                name: payload.name!,
                brand: payload.brand,
                size: payload.size,
                image_url: payload.image_url,
                source_url: payload.source_url,
                step_category: payload.step_category ?? 'other',
                active_ingredients: payload.active_ingredients,
                full_ingredients: payload.full_ingredients,
                times_added: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
              return next;
            });
          }
        }

        const insertRow: Record<string, unknown> = {
          user_id: user.id,
          catalog_id: catalogId || null,
          started_at: payload.started_at || today,
          date_opened: payload.date_opened || null,
          date_purchased: payload.date_purchased || null,
          longevity_months: payload.longevity_months ?? null,
          notes: payload.notes || null,
        };
        if (!catalogId && payload.name) {
          insertRow.name = payload.name;
          insertRow.brand = payload.brand ?? null;
          insertRow.image_url = payload.image_url ?? null;
          insertRow.step_category = payload.step_category ?? 'other';
        }

        const { data, error } = await supabase
          .from('products')
          .insert(insertRow)
          .select()
          .single();

        if (error) {
          console.error('Failed to save product to Supabase:', error);
          throw error;
        }

        const newProduct = data as Product;
        const updated = [newProduct, ...products];
        setProducts(updated);
        await cacheProducts(updated);
        const catalogEntry = catalogId ? catalog.get(catalogId) ?? (payload.name ? {
          id: catalogId,
          name: payload.name,
          brand: payload.brand,
          size: payload.size,
          image_url: payload.image_url,
          source_url: payload.source_url,
          step_category: (payload.step_category ?? 'other') as import('../types').StepCategory,
          active_ingredients: payload.active_ingredients,
          full_ingredients: payload.full_ingredients,
          times_added: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as CatalogProduct : null) : null;
        return mergeProductWithCatalog(newProduct, catalogEntry);
      } else {
        const now = new Date().toISOString();
        const newProduct: Product = {
          id: generateId(),
          user_id: 'guest',
          catalog_id: catalogId ?? undefined,
          name: payload.name,
          brand: payload.brand,
          image_url: payload.image_url,
          step_category: payload.step_category,
          started_at: payload.started_at || today,
          date_opened: payload.date_opened,
          date_purchased: payload.date_purchased,
          longevity_months: payload.longevity_months,
          notes: payload.notes,
          created_at: now,
          updated_at: now,
        };
        const updated = [newProduct, ...products];
        setProducts(updated);
        await cacheProducts(updated);
        return mergeProductWithCatalog(newProduct, null);
      }
    },
    [products, catalog, user, isGuest, cacheProducts, pushToCatalog],
  );

  /** Add a product from the shared catalog to the user's personal list. */
  const addProductFromCatalog = useCallback(
    async (catalogProduct: CatalogProduct): Promise<ProductWithCatalog> => {
      const today = new Date().toISOString().split('T')[0];

      if (!isGuest && user) {
        await supabase
          .from('product_catalog')
          .update({
            times_added: (catalogProduct.times_added ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', catalogProduct.id);

        const { data, error } = await supabase
          .from('products')
          .insert({
            user_id: user.id,
            catalog_id: catalogProduct.id,
            started_at: today,
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to add product from catalog:', error);
          throw error;
        }

        const newProduct = data as Product;
        const updated = [newProduct, ...products];
        setProducts(updated);
        await cacheProducts(updated);
        setCatalog((prev) => {
          const next = new Map(prev);
          next.set(catalogProduct.id, catalogProduct);
          return next;
        });
        return mergeProductWithCatalog(newProduct, catalogProduct);
      } else {
        const now = new Date().toISOString();
        const newProduct: Product = {
          id: generateId(),
          user_id: 'guest',
          catalog_id: catalogProduct.id,
          started_at: today,
          created_at: now,
          updated_at: now,
        };
        const updated = [newProduct, ...products];
        setProducts(updated);
        await cacheProducts(updated);
        return mergeProductWithCatalog(newProduct, catalogProduct);
      }
    },
    [products, user, isGuest, cacheProducts],
  );

  const allowedProductUpdateKeys: (keyof Product)[] = [
    'longevity_months', 'date_purchased', 'date_opened', 'notes',
    'started_at', 'stopped_at', 'name', 'brand', 'image_url', 'step_category',
  ];

  const updateProduct = useCallback(
    async (id: string, updates: Partial<Product>) => {
      const filtered: Partial<Product> = {};
      allowedProductUpdateKeys.forEach((k) => {
        if (k in updates && updates[k] !== undefined) filtered[k] = updates[k];
      });
      const now = new Date().toISOString();

      if (!isGuest && user) {
        const { error } = await supabase
          .from('products')
          .update({ ...filtered, updated_at: now })
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Failed to update product in Supabase:', error);
          throw error;
        }
      }

      const updated = products.map((p) =>
        p.id === id ? { ...p, ...filtered, updated_at: now } : p,
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
    (id: string): ProductWithCatalog | undefined =>
      productsWithCatalog.find((p) => p.id === id),
    [productsWithCatalog],
  );

  // ── Catalog helpers ────────────────────────────────────────────────────

  const isProductInMyList = useCallback(
    (catalogId: string): boolean => {
      return products.some((p) => p.catalog_id === catalogId);
    },
    [products],
  );

  // ── Ingredient Conflicts (per time window from routine steps) ───────────

  const allConflicts: DetectedConflict[] = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const stepsActiveToday = routineSteps.filter((s) => s.product_id && isStepActiveOnDate(s, today));
    const productIds = new Set(stepsActiveToday.map((s) => s.product_id!));
    const windowProducts = productsWithCatalog.filter((p) => productIds.has(p.id) && !p.stopped_at);

    const byWindow: Record<string, ProductWithCatalog[]> = { morning: [], evening: [] };
    const seenMorning = new Set<string>();
    const seenEvening = new Set<string>();
    stepsActiveToday.forEach((step) => {
      const product = windowProducts.find((p) => p.id === step.product_id);
      if (!product) return;
      const tod = step.time_of_day;
      if (tod === 'morning' && !seenMorning.has(product.id)) {
        seenMorning.add(product.id);
        byWindow.morning.push(product);
      } else if (tod === 'evening' && !seenEvening.has(product.id)) {
        seenEvening.add(product.id);
        byWindow.evening.push(product);
      } else if (tod === 'both') {
        if (!seenMorning.has(product.id)) {
          seenMorning.add(product.id);
          byWindow.morning.push(product);
        }
        if (!seenEvening.has(product.id)) {
          seenEvening.add(product.id);
          byWindow.evening.push(product);
        }
      }
    });
    const seen = new Set<string>();
    const combined: DetectedConflict[] = [];
    [byWindow.morning, byWindow.evening].forEach((list) => {
      const conflicts = detectConflicts(list);
      conflicts.forEach((c) => {
        const key = [c.rule.id, c.productA.id, c.productB.id].sort().join(':');
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(c);
        }
      });
    });
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    combined.sort((a, b) => order[a.rule.severity] - order[b.rule.severity]);
    return combined;
  }, [routineSteps, productsWithCatalog]);

  const getConflictsForProduct = useCallback(
    (productId: string): DetectedConflict[] => {
      const product = productsWithCatalog.find((p) => p.id === productId);
      if (!product) return [];
      const today = new Date().toISOString().split('T')[0];
      const stepsWithThisProduct = routineSteps.filter(
        (s) => s.product_id === productId && isStepActiveOnDate(s, today),
      );
      const timeWindows = new Set(stepsWithThisProduct.map((s) => s.time_of_day));
      const stepsInSameWindow = routineSteps.filter(
        (s) =>
          s.product_id &&
          isStepActiveOnDate(s, today) &&
          (timeWindows.has(s.time_of_day) ||
            timeWindows.has('both') ||
            s.time_of_day === 'both'),
      );
      const idsInSameWindow = new Set(stepsInSameWindow.map((s) => s.product_id!));
      const others = productsWithCatalog.filter(
        (p) => idsInSameWindow.has(p.id) && p.id !== productId && !p.stopped_at,
      );
      return detectConflictsForProduct(product, [product, ...others]).filter(
        (c) => c.productA.id === productId || c.productB.id === productId,
      );
    },
    [productsWithCatalog, routineSteps],
  );

  // ── Context Value ─────────────────────────────────────────────────────

  const value = useMemo<ProductsContextValue>(
    () => ({
      products: productsWithCatalog,
      activeProducts,
      inactiveProducts,
      isLoading,
      addProduct,
      addProductFromCatalog,
      updateProduct,
      deleteProduct,
      stopProduct,
      restartProduct,
      getProductById,
      getProductsForDate,
      isProductInMyList,
      allConflicts,
      getConflictsForProduct,
      reload: loadData,
    }),
    [
      productsWithCatalog,
      activeProducts,
      inactiveProducts,
      isLoading,
      addProduct,
      addProductFromCatalog,
      updateProduct,
      deleteProduct,
      stopProduct,
      restartProduct,
      getProductById,
      getProductsForDate,
      isProductInMyList,
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

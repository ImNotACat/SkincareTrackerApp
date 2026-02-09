import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { detectConflicts, detectConflictsForProduct } from '../lib/ingredient-conflicts';
import { isProductActiveOnDate } from '../hooks/useProducts';
import type { Product, CatalogProduct, ScheduleType } from '../types';
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
  addProductFromCatalog: (
    catalogProduct: CatalogProduct,
  ) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  stopProduct: (id: string) => Promise<void>;
  restartProduct: (id: string) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  getProductsForDate: (dateStr: string) => Product[];
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

  // ── Push to shared catalog (fire-and-forget for non-guest users) ─────────

  const pushToCatalog = useCallback(
    async (product: Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<string | null> => {
      if (isGuest || !user) return null;
      try {
        // Check for existing match (name + brand)
        let query = supabase
          .from('product_catalog')
          .select('id, times_added')
          .ilike('name', product.name.trim());

        if (product.brand) {
          query = query.ilike('brand', product.brand.trim());
        } else {
          query = query.is('brand', null);
        }

        const { data: existing } = await query.limit(1);

        if (existing && existing.length > 0) {
          // Already in catalog — bump counter
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

        // Insert new catalog entry
        const { data, error } = await supabase
          .from('product_catalog')
          .insert({
            name: product.name.trim(),
            brand: product.brand?.trim() || null,
            size: product.size?.trim() || null,
            image_url: product.image_url || null,
            source_url: product.source_url || null,
            step_category: product.step_category,
            active_ingredients: product.active_ingredients || null,
            full_ingredients: product.full_ingredients || null,
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
    async (
      product: Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    ): Promise<Product> => {
      if (!isGuest && user) {
        // Also push to the shared catalog
        const catalogId = await pushToCatalog(product);

        // Supabase insert (id, created_at, updated_at default on the server)
        const { data, error } = await supabase
          .from('products')
          .insert({
            ...product,
            user_id: user.id,
            catalog_id: catalogId || undefined,
          })
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
    [products, user, isGuest, cacheProducts, pushToCatalog],
  );

  /** Add a product from the shared catalog to the user's personal list. */
  const addProductFromCatalog = useCallback(
    async (catalogProduct: CatalogProduct): Promise<Product> => {
      const today = new Date().toISOString().split('T')[0];

      const productData = {
        name: catalogProduct.name,
        brand: catalogProduct.brand || undefined,
        size: catalogProduct.size || undefined,
        image_url: catalogProduct.image_url || undefined,
        source_url: catalogProduct.source_url || undefined,
        step_category: catalogProduct.step_category,
        active_ingredients: catalogProduct.active_ingredients || undefined,
        full_ingredients: catalogProduct.full_ingredients || undefined,
        time_of_day: 'both' as const,
        times_per_week: 7,
        started_at: today,
        catalog_id: catalogProduct.id,
      };

      if (!isGuest && user) {
        // Bump the catalog counter
        await supabase
          .from('product_catalog')
          .update({
            times_added: catalogProduct.times_added + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', catalogProduct.id);

        const { data, error } = await supabase
          .from('products')
          .insert({ ...productData, user_id: user.id })
          .select()
          .single();

        if (error) {
          console.error('Failed to add product from catalog:', error);
          throw error;
        }

        const updated = [data as Product, ...products];
        setProducts(updated);
        await cacheProducts(updated);
        return data as Product;
      } else {
        const now = new Date().toISOString();
        const newProduct: Product = {
          ...productData,
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

  // ── Catalog helpers ────────────────────────────────────────────────────

  const isProductInMyList = useCallback(
    (catalogId: string): boolean => {
      return products.some((p) => p.catalog_id === catalogId);
    },
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
      products,
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

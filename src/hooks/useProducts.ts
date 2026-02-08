import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '../types';
import { detectConflicts, detectConflictsForProduct } from '../lib/ingredient-conflicts';
import type { DetectedConflict } from '../lib/ingredient-conflicts';

// ─── Storage Key ────────────────────────────────────────────────────────────

const STORAGE_KEY = '@glow/products';

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
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
        setProducts(JSON.parse(json));
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
    allConflicts,
    getConflictsForProduct,
    reload: loadData,
  };
}

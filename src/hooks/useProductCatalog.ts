import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { CatalogProduct, StepCategory } from '../types';

// ─── useProductCatalog ─────────────────────────────────────────────────────
// Hook for browsing and searching the shared product catalog.
// All authenticated users can read; adding is done via ProductsContext.

export function useProductCatalog() {
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [featured, setFeatured] = useState<CatalogProduct[]>([]);
  const [isFeaturedLoading, setIsFeaturedLoading] = useState(false);

  /**
   * Search the catalog by name, brand, or ingredients.
   */
  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      // Search by name or brand (case-insensitive partial match)
      const term = `%${query.trim()}%`;
      const { data, error } = await supabase
        .from('product_catalog')
        .select('*')
        .or(`name.ilike.${term},brand.ilike.${term},active_ingredients.ilike.${term}`)
        .order('times_added', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Catalog search error:', error);
        setResults([]);
      } else {
        setResults((data || []) as CatalogProduct[]);
      }
    } catch (error) {
      console.error('Catalog search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Load featured/popular products (most added by users).
   */
  const loadFeatured = useCallback(async () => {
    setIsFeaturedLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_catalog')
        .select('*')
        .order('times_added', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Failed to load featured products:', error);
      } else {
        setFeatured((data || []) as CatalogProduct[]);
      }
    } catch (error) {
      console.error('Failed to load featured:', error);
    } finally {
      setIsFeaturedLoading(false);
    }
  }, []);

  /**
   * Browse by category.
   */
  const browseByCategory = useCallback(async (category: StepCategory) => {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase
        .from('product_catalog')
        .select('*')
        .eq('step_category', category)
        .order('times_added', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Category browse error:', error);
        setResults([]);
      } else {
        setResults((data || []) as CatalogProduct[]);
      }
    } catch (error) {
      console.error('Category browse failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Add a product to the shared catalog. Returns the catalog entry.
   * If a matching product already exists (same name + brand), returns the existing one
   * and increments its times_added counter.
   */
  const addToCatalog = useCallback(async (product: {
    name: string;
    brand?: string;
    size?: string;
    image_url?: string;
    source_url?: string;
    step_category: StepCategory;
    active_ingredients?: string;
    full_ingredients?: string;
    created_by?: string;
  }): Promise<CatalogProduct | null> => {
    try {
      // Check for existing match (name + brand, case-insensitive)
      let query = supabase
        .from('product_catalog')
        .select('*')
        .ilike('name', product.name.trim());

      if (product.brand) {
        query = query.ilike('brand', product.brand.trim());
      } else {
        query = query.is('brand', null);
      }

      const { data: existing } = await query.limit(1);

      if (existing && existing.length > 0) {
        // Existing product — increment counter
        const catalogEntry = existing[0] as CatalogProduct;
        await supabase
          .from('product_catalog')
          .update({
            times_added: catalogEntry.times_added + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', catalogEntry.id);

        return { ...catalogEntry, times_added: catalogEntry.times_added + 1 };
      }

      // New product — insert into catalog
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
          created_by: product.created_by || null,
          times_added: 1,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to add to catalog:', error);
        return null;
      }

      return data as CatalogProduct;
    } catch (error) {
      console.error('Catalog add failed:', error);
      return null;
    }
  }, []);

  return {
    results,
    isSearching,
    hasSearched,
    featured,
    isFeaturedLoading,
    search,
    loadFeatured,
    browseByCategory,
    addToCatalog,
  };
}

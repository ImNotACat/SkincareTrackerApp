import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  searchProducts as searchOBF,
  mapOBFToProductData,
} from '../lib/openbeautyfacts';
import type { CatalogProduct, StepCategory } from '../types';

// ─── Unified Product Search ──────────────────────────────────────────────────
// Searches both the app's product_catalog and Open Beauty Facts in parallel,
// deduplicates by name+brand, and returns a single merged list.
// Catalog results get priority (richer data, already in the app DB).

export type UnifiedProductSource = 'catalog' | 'obf';

export interface UnifiedProduct {
  /** Internal: which data source this result came from */
  _source: UnifiedProductSource;
  /** Set when _source === 'catalog' */
  _catalogId?: string;
  /** Set when _source === 'obf' */
  _obfCode?: string;
  /** The full catalog entry if from catalog */
  _catalogProduct?: CatalogProduct;

  // Common display fields
  name: string;
  brand?: string;
  size?: string;
  image_url?: string;
  ingredients?: string;
  active_ingredients?: string[];
  step_category?: StepCategory;
  source_url?: string;
}

/**
 * Normalize a string for deduplication (lowercase, trimmed, collapsed whitespace).
 */
function normalize(s?: string): string {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Build a dedup key from name + brand.
 */
function dedupKey(name?: string, brand?: string): string {
  return `${normalize(name)}|||${normalize(brand)}`;
}

/**
 * Merge two lists: base first, then items from additional that don't duplicate (by name+brand).
 */
function mergeDedup(
  base: UnifiedProduct[],
  additional: UnifiedProduct[],
): UnifiedProduct[] {
  const seen = new Set<string>();
  const out: UnifiedProduct[] = [];
  for (const item of base) {
    const key = dedupKey(item.name, item.brand);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  for (const item of additional) {
    const key = dedupKey(item.name, item.brand);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

export function useUnifiedProductSearch() {
  const [results, setResults] = useState<UnifiedProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchIdRef = useRef(0);

  /**
   * Search both data sources in parallel. Catalog results are shown as soon as
   * they return; OBF results are merged in when they arrive so the UI feels fast.
   */
  const search = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const searchId = ++searchIdRef.current;
    setIsSearching(true);
    setHasSearched(true);

    // Catalog: show immediately when it resolves (usually faster than OBF)
    searchCatalog(trimmed)
      .then((catalogItems) => {
        if (searchId !== searchIdRef.current) return;
        setResults((prev) => mergeDedup(catalogItems, prev));
        setIsSearching(false);
      })
      .catch((err) => {
        console.error('Catalog search error:', err);
        if (searchId === searchIdRef.current) setResults([]);
        setIsSearching(false);
      });

    // OBF: merge in when it resolves; list updates again when this finishes
    searchOBFProducts(trimmed)
      .then((obfItems) => {
        if (searchId !== searchIdRef.current) return;
        setResults((prev) => mergeDedup(prev, obfItems));
      })
      .catch(() => {
        // Already logged in searchOBFProducts; no need to block or reset UI
      });
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setHasSearched(false);
  }, []);

  return {
    results,
    isSearching,
    hasSearched,
    search,
    clearResults,
  };
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

async function searchCatalog(query: string): Promise<UnifiedProduct[]> {
  const term = `%${query}%`;
  const { data, error } = await supabase
    .from('product_catalog')
    .select('*')
    .or(`name.ilike.${term},brand.ilike.${term}`)
    .order('times_added', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Catalog search error:', error);
    return [];
  }

  return (data || []).map((p: CatalogProduct) => ({
    _source: 'catalog' as const,
    _catalogId: p.id,
    _catalogProduct: p,
    name: p.name,
    brand: p.brand || undefined,
    size: p.size || undefined,
    image_url: p.image_url || undefined,
    ingredients: p.full_ingredients || undefined,
    active_ingredients: p.active_ingredients
      ? p.active_ingredients.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined,
    step_category: p.step_category,
    source_url: p.source_url || undefined,
  }));
}

async function searchOBFProducts(query: string): Promise<UnifiedProduct[]> {
  try {
    const response = await searchOBF(query, 1);
    return response.products
      .filter((p) => p.product_name) // Skip products without a name
      .map((p) => {
        const mapped = mapOBFToProductData(p);
        return {
          _source: 'obf' as const,
          _obfCode: p.code,
          name: mapped.name,
          brand: mapped.brand,
          size: mapped.size,
          image_url: mapped.image_url,
          ingredients: mapped.ingredients,
          active_ingredients: mapped.active_ingredients,
          step_category: mapped.step_category,
          source_url: mapped.source_url,
        };
      })
      .filter((p) => p.name); // Double-check name exists
  } catch (error) {
    console.error('OBF search error:', error);
    return [];
  }
}

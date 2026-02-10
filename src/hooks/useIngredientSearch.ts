import { useState, useEffect, useCallback } from 'react';
import { supabase, Tables } from '../lib/supabase';
import type { ActiveIngredientRow } from './useActiveIngredients';

const SEARCH_DEBOUNCE_MS = 300;

export function useIngredientSearch(query: string) {
  const [results, setResults] = useState<ActiveIngredientRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from(Tables.ACTIVE_INGREDIENTS)
        .select('id, name, section, benefits, side_effects, risky_interactions, description, created_at, updated_at')
        .ilike('name', `%${trimmed}%`)
        .order('name', { ascending: true })
        .limit(20);

      if (error) {
        setResults([]);
        return;
      }
      setResults((data || []) as ActiveIngredientRow[]);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, search]);

  return { results, isSearching };
}

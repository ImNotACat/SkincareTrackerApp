import { useState, useEffect, useCallback } from 'react';
import { supabase, Tables } from '../lib/supabase';
import type { ActiveIngredientRow } from './useActiveIngredients';

export function useIngredientById(id: string | undefined | null) {
  const [ingredient, setIngredient] = useState<ActiveIngredientRow | null>(null);
  const [isLoading, setIsLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (ingredientId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from(Tables.ACTIVE_INGREDIENTS)
        .select('id, name, section, benefits, side_effects, risky_interactions, description, full_description, created_at, updated_at')
        .eq('id', ingredientId)
        .maybeSingle();

      if (err) {
        setError(err.message);
        setIngredient(null);
        return;
      }
      setIngredient((data as ActiveIngredientRow) || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ingredient');
      setIngredient(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      load(id);
    } else {
      setIngredient(null);
      setError(null);
      setIsLoading(false);
    }
  }, [id, load]);

  return { ingredient, isLoading, error, reload: () => id && load(id) };
}

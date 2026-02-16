import { useState, useEffect, useCallback } from 'react';
import { supabase, Tables } from '../lib/supabase';
import type { IngredientSection } from '../constants/skincare';
import { INGREDIENT_SECTIONS } from '../constants/skincare';

export interface ActiveIngredientRow {
  id: string;
  name: string;
  section: string | null;
  benefits: string | null;
  side_effects: string | null;
  risky_interactions: string | null;
  description: string | null;
  full_description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches active ingredients from the database, grouped by section.
 * Falls back to the static INGREDIENT_SECTIONS when the table is empty or the request fails.
 */
function pickRandom<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function useActiveIngredients() {
  const [sections, setSections] = useState<IngredientSection[]>(INGREDIENT_SECTIONS);
  const [rawRows, setRawRows] = useState<ActiveIngredientRow[]>([]);
  const [spotlightIngredient, setSpotlightIngredient] = useState<ActiveIngredientRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fromDb, setFromDb] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from(Tables.ACTIVE_INGREDIENTS)
        .select('id, name, section, benefits, side_effects, risky_interactions, description, full_description, created_at, updated_at')
        .order('section', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });

      if (error) {
        console.warn('Active ingredients fetch failed, using static list:', error.message);
        setSections(INGREDIENT_SECTIONS);
        setRawRows([]);
        setSpotlightIngredient(null);
        setFromDb(false);
        return;
      }

      const rows = (data || []) as ActiveIngredientRow[];
      if (rows.length === 0) {
        setSections(INGREDIENT_SECTIONS);
        setRawRows([]);
        setSpotlightIngredient(null);
        setFromDb(false);
        return;
      }

      setRawRows(rows);
      setSpotlightIngredient(pickRandom(rows));

      const bySection = new Map<string, string[]>();
      for (const row of rows) {
        const section = (row.section && row.section.trim()) || 'Other';
        if (!bySection.has(section)) bySection.set(section, []);
        bySection.get(section)!.push(row.name);
      }
      const nextSections: IngredientSection[] = [];
      const sectionOrder = [...bySection.keys()].sort((a, b) => {
        if (a === 'Other') return 1;
        if (b === 'Other') return -1;
        return a.localeCompare(b);
      });
      for (const title of sectionOrder) {
        nextSections.push({ title, data: bySection.get(title)! });
      }
      setSections(nextSections);
      setFromDb(true);
    } catch (e) {
      console.warn('Active ingredients load error, using static list:', e);
      setSections(INGREDIENT_SECTIONS);
      setRawRows([]);
      setSpotlightIngredient(null);
      setFromDb(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { sections, rawRows, spotlightIngredient, isLoading, fromDb, reload: load };
}

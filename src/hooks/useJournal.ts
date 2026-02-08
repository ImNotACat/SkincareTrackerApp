import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { JournalEntry } from '../types';

// ─── Storage Key ────────────────────────────────────────────────────────────

const STORAGE_KEY = '@glow/journal';

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from storage on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        setEntries(JSON.parse(json));
      }
    } catch (error) {
      console.error('Failed to load journal entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveEntries = useCallback(async (updated: JournalEntry[]) => {
    setEntries(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────

  /** Entries sorted newest-first */
  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [entries],
  );

  /** Entries grouped by date string (YYYY-MM-DD) for section list */
  const groupedByDate = useMemo(() => {
    const groups: Record<string, JournalEntry[]> = {};
    for (const entry of sortedEntries) {
      const dateKey = entry.created_at.split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(entry);
    }
    return Object.entries(groups).map(([date, items]) => ({ date, entries: items }));
  }, [sortedEntries]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const addEntry = useCallback(
    async (data: { type: JournalEntry['type']; text?: string; image_uri?: string }) => {
      const newEntry: JournalEntry = {
        id: generateId(),
        user_id: 'local',
        type: data.type,
        text: data.text,
        image_uri: data.image_uri,
        created_at: new Date().toISOString(),
      };
      await saveEntries([...entries, newEntry]);
      return newEntry;
    },
    [entries, saveEntries],
  );

  const updateEntry = useCallback(
    async (id: string, updates: Partial<Pick<JournalEntry, 'text'>>) => {
      const updated = entries.map((e) =>
        e.id === id ? { ...e, ...updates } : e,
      );
      await saveEntries(updated);
    },
    [entries, saveEntries],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      await saveEntries(entries.filter((e) => e.id !== id));
    },
    [entries, saveEntries],
  );

  return {
    entries: sortedEntries,
    groupedByDate,
    isLoading,
    addEntry,
    updateEntry,
    deleteEntry,
    reload: loadData,
  };
}

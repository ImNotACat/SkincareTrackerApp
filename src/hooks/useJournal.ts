import { useState, useEffect, useCallback, useMemo } from 'react';
import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Tables } from '../lib/supabase';
import type { JournalEntry } from '../types';

const JOURNAL_PHOTO_MAX_SIDE = 1200;
const JOURNAL_PHOTO_QUALITY = 0.8;

// ─── Storage Key ────────────────────────────────────────────────────────────

const STORAGE_KEY = '@glow/journal';
const JOURNAL_PHOTOS_BUCKET = 'journal-photos';

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Map DB row to app JournalEntry (image_url → image_uri for display) */
function rowToEntry(row: {
  id: string;
  user_id: string;
  type: string;
  text?: string | null;
  image_url?: string | null;
  tags?: string[] | null;
  created_at: string;
}): JournalEntry {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type as JournalEntry['type'],
    text: row.text ?? undefined,
    image_uri: row.image_url ?? undefined,
    tags: Array.isArray(row.tags) && row.tags.length > 0 ? row.tags : undefined,
    created_at: row.created_at,
  };
}

/** Get a signed URL for a Supabase storage image so it loads in the app (works for private buckets). */
async function getSignedImageUrl(publicUrl: string): Promise<string> {
  const match = publicUrl.match(/\/journal-photos\/(.+)$/);
  const path = match ? match[1].replace(/\?.*$/, '') : null;
  if (!path) return publicUrl;
  const { data, error } = await supabase.storage
    .from(JOURNAL_PHOTOS_BUCKET)
    .createSignedUrl(path, 60 * 60); // 1 hour
  if (error || !data?.signedUrl) return publicUrl;
  return data.signedUrl;
}

function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

/** Resize image so longest side is JOURNAL_PHOTO_MAX_SIDE, then return base64 JPEG. Keeps file size small for storage. */
async function resizeJournalPhoto(localUri: string): Promise<string> {
  const { width, height } = await getImageDimensions(localUri);
  const max = JOURNAL_PHOTO_MAX_SIDE;
  let targetWidth = width;
  let targetHeight = height;
  if (width > max || height > max) {
    if (width >= height) {
      targetWidth = max;
      targetHeight = Math.round((height * max) / width);
    } else {
      targetHeight = max;
      targetWidth = Math.round((width * max) / height);
    }
  }
  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: targetWidth, height: targetHeight } }],
    {
      compress: JOURNAL_PHOTO_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );
  if (!result.base64) {
    const file = new File(result.uri);
    return file.base64();
  }
  return result.base64;
}

/** Upload local photo to Supabase Storage. Resizes first to stay within free tier. Throws on failure. */
async function uploadJournalPhoto(
  userId: string,
  localUri: string,
): Promise<string> {
  let base64: string;
  try {
    base64 = await resizeJournalPhoto(localUri);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Could not read image: ${msg}`);
  }
  if (!base64 || base64.length === 0) {
    throw new Error('Image file is empty');
  }
  const arrayBuffer = decode(base64);
  const filename = `${userId}/${generateId()}.jpg`;
  const contentType = 'image/jpeg';

  async function doUpload(): Promise<string> {
    const { data, error } = await supabase.storage
      .from(JOURNAL_PHOTOS_BUCKET)
      .upload(filename, arrayBuffer, { contentType, upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(JOURNAL_PHOTOS_BUCKET).getPublicUrl(data.path);
    return urlData.publicUrl;
  }

  let err: unknown;
  try {
    return await doUpload();
  } catch (e) {
    err = e;
  }
  const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : String(err);
  const isBucketMissing =
    /bucket.*not found|not found|404|resource.*not found|does not exist/i.test(msg);
  if (isBucketMissing) {
    const { error: createErr } = await supabase.storage.createBucket(JOURNAL_PHOTOS_BUCKET, {
      public: true,
      fileSizeLimit: 5242880,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
    if (!createErr) {
      try {
        return await doUpload();
      } catch (retryE) {
        const retryMsg = retryE && typeof retryE === 'object' && 'message' in retryE ? String((retryE as { message: string }).message) : String(retryE);
        throw new Error(`Photo upload failed: ${retryMsg}`);
      }
    }
  }
  throw new Error(`Photo upload failed: ${msg}`);
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useJournal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      if (user?.id) {
        const { data, error } = await supabase
          .from(Tables.JOURNAL_ENTRIES)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Failed to load journal from Supabase:', error);
          setEntries([]);
          return;
        }
        const entriesWithImages = (data || []).map((row) => rowToEntry(row));
        const migrated = await Promise.all(
          entriesWithImages.map(async (e) => {
            if (!e.image_uri || !e.image_uri.includes('journal-photos')) return e;
            const signed = await getSignedImageUrl(e.image_uri);
            return { ...e, image_uri: signed };
          }),
        );
        setEntries(migrated);
      } else {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) {
          const parsed: JournalEntry[] = JSON.parse(json);
          const migrated = parsed.map((e) => ({
            ...e,
            tags: Array.isArray(e.tags) ? e.tags : [],
          }));
          setEntries(migrated);
        } else {
          setEntries([]);
        }
      }
    } catch (error) {
      console.error('Failed to load journal entries:', error);
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveEntriesLocal = useCallback(async (updated: JournalEntry[]) => {
    setEntries(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────

  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [entries],
  );

  const groupedByDate = useMemo(() => {
    const groups: Record<string, JournalEntry[]> = {};
    for (const entry of sortedEntries) {
      const dateKey = entry.created_at.split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(entry);
    }
    return Object.entries(groups).map(([date, items]) => ({ date, entries: items }));
  }, [sortedEntries]);

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const addEntry = useCallback(
    async (data: {
      type: JournalEntry['type'];
      text?: string;
      image_uri?: string;
      tags?: string[];
    }) => {
      const tags = data.tags && data.tags.length > 0 ? data.tags : undefined;
      const created_at = new Date().toISOString();

      if (user?.id) {
        let image_url: string | null = null;
        if (data.type === 'photo' && data.image_uri) {
          image_url = await uploadJournalPhoto(user.id, data.image_uri);
        }
        const { data: row, error } = await supabase
          .from(Tables.JOURNAL_ENTRIES)
          .insert({
            user_id: user.id,
            type: data.type,
            text: data.text ?? null,
            image_url,
            tags: tags ?? [],
            created_at,
          })
          .select()
          .single();
        if (error) {
          console.error('Failed to save journal entry to Supabase:', error);
          throw error;
        }
        const newEntry = rowToEntry(row);
        setEntries((prev) => [newEntry, ...prev]);
        return newEntry;
      }

      const newEntry: JournalEntry = {
        id: generateId(),
        user_id: 'local',
        type: data.type,
        text: data.text,
        image_uri: data.image_uri,
        tags,
        created_at,
      };
      await saveEntriesLocal([newEntry, ...entries]);
      return newEntry;
    },
    [user?.id, entries, saveEntriesLocal],
  );

  const updateEntry = useCallback(
    async (id: string, updates: Partial<Pick<JournalEntry, 'text' | 'tags'>>) => {
      if (user?.id) {
        const { error } = await supabase
          .from(Tables.JOURNAL_ENTRIES)
          .update({
            text: updates.text ?? null,
            tags: updates.tags ?? [],
          })
          .eq('id', id)
          .eq('user_id', user.id);
        if (error) {
          console.error('Failed to update journal entry in Supabase:', error);
          throw error;
        }
      }
      const updated = entries.map((e) =>
        e.id === id ? { ...e, ...updates } : e,
      );
      setEntries(updated);
      if (!user?.id) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    [user?.id, entries],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      if (user?.id) {
        const { error } = await supabase
          .from(Tables.JOURNAL_ENTRIES)
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
        if (error) {
          console.error('Failed to delete journal entry from Supabase:', error);
          throw error;
        }
      }
      const updated = entries.filter((e) => e.id !== id);
      setEntries(updated);
      if (!user?.id) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    [user?.id, entries],
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

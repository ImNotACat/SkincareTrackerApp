import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Supabase Configuration ─────────────────────────────────────────────────
// These values come from your Supabase project dashboard.
// Create a .env file in the project root based on .env.example.

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Database Table Names ───────────────────────────────────────────────────

export const Tables = {
  PROFILES: 'profiles',
  ROUTINE_STEPS: 'routine_steps',
  COMPLETED_STEPS: 'completed_steps',
  PRODUCTS: 'products',
  JOURNAL_ENTRIES: 'journal_entries',
} as const;

import { supabase } from './supabase';

// ─── Auth Utilities ──────────────────────────────────────────────────────────
// Sign-in with Google is handled in AuthContext (src/contexts/AuthContext.tsx)
// using platform-specific flows (web redirect vs native in-app browser).

/**
 * Returns the current session (if any).
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

/**
 * Returns the current user (if any).
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

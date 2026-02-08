import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

// ─── Google OAuth Configuration ─────────────────────────────────────────────
// Complete OAuth setup:
// 1. Create a Google Cloud project and enable Google Sign-In
// 2. Create OAuth 2.0 credentials (Web + Android client IDs)
// 3. Add your Supabase callback URL as a redirect URI:
//    https://<your-project>.supabase.co/auth/v1/callback
// 4. Enable Google provider in Supabase Dashboard > Auth > Providers
// 5. Fill in client ID and secret in Supabase Dashboard

WebBrowser.maybeCompleteAuthSession();

const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'glow-skincare',
  path: 'auth/callback',
});

/**
 * Initiates Google OAuth sign-in flow via Supabase Auth.
 *
 * This is a skeleton implementation. To complete it:
 * - Set up Google Cloud Console credentials
 * - Configure Supabase Auth with Google provider
 * - Set environment variables for client IDs
 */
export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;

    // Open the OAuth URL in the system browser
    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri,
      );

      if (result.type === 'success') {
        // Extract the session from the redirect URL
        const url = result.url;
        // Supabase will handle session exchange automatically
        // when using signInWithOAuth with PKCE flow
        console.log('OAuth redirect successful:', url);
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('Google sign-in error:', error);
    return { data: null, error };
  }
}

/**
 * Signs out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Sign-out error:', error);
  }
  return { error };
}

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

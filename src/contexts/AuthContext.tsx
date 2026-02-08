import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import type { AuthState, UserProfile } from '../types';

// Required for OAuth to work properly on mobile
WebBrowser.maybeCompleteAuthSession();

// ─── Context Types ──────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
  });

  // Map Supabase session to our user profile
  const mapSessionToUser = useCallback((session: Session | null): UserProfile | null => {
    if (!session?.user) return null;
    return {
      id: session.user.id,
      email: session.user.email || '',
      display_name: session.user.user_metadata?.full_name || session.user.email || '',
      avatar_url: session.user.user_metadata?.avatar_url || undefined,
      created_at: session.user.created_at,
    };
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        isLoading: false,
        isAuthenticated: !!session,
        user: mapSessionToUser(session),
      });
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setState({
          isLoading: false,
          isAuthenticated: !!session,
          user: mapSessionToUser(session),
        });

        // Ensure a profile row exists for authenticated users
        if (session?.user) {
          const { id, email, user_metadata } = session.user;
          supabase
            .from('profiles')
            .upsert(
              {
                id,
                email: email || user_metadata?.email || '',
                display_name: user_metadata?.full_name || email || '',
                avatar_url: user_metadata?.avatar_url || null,
              },
              { onConflict: 'id' },
            )
            .then(({ error }) => {
              if (error) console.warn('Profile upsert fallback failed:', error.message);
            });
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [mapSessionToUser]);

  // ── Google Sign-In ──────────────────────────────────────────────────────

  const signInWithGoogle = useCallback(async () => {
    // ── Web flow: full-page redirect ──────────────────────────────────
    if (Platform.OS === 'web') {
      const redirectUri = `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUri },
      });

      if (error) throw error;

      // Redirect the current page to the Supabase OAuth URL
      if (data?.url) {
        window.location.href = data.url;
      }
      return;
    }

    // ── Native flow: in-app browser ───────────────────────────────────
    const redirectUri = Linking.createURL('auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri,
        { showInRecents: true },
      );

      if (result.type === 'success' && result.url) {
        const url = result.url;

        // Extract tokens from hash fragment (most common for Supabase)
        if (url.includes('#')) {
          const hashParams = new URLSearchParams(url.split('#')[1]);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) throw sessionError;
            return;
          }
        }

        // Fallback: try query params or regex parsing
        try {
          const urlObj = new URL(url);
          const accessToken = urlObj.searchParams.get('access_token');
          const refreshToken = urlObj.searchParams.get('refresh_token');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            return;
          }
        } catch {
          // URL() can fail for custom schemes — try regex
          const tokenMatch = url.match(/access_token=([^&#]+)/);
          const refreshMatch = url.match(/refresh_token=([^&#]+)/);

          if (tokenMatch && refreshMatch) {
            await supabase.auth.setSession({
              access_token: tokenMatch[1],
              refresh_token: refreshMatch[1],
            });
          }
        }
      }
    }
  }, []);

  // ── Sign Out ────────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Sign-out error:', error);
    setState({ isLoading: false, isAuthenticated: false, user: null });
  }, []);

  // ── Guest Mode ──────────────────────────────────────────────────────────

  const continueAsGuest = useCallback(() => {
    setState({
      isLoading: false,
      isAuthenticated: true,
      user: {
        id: 'guest',
        email: 'guest@local',
        display_name: 'Guest',
        created_at: new Date().toISOString(),
      },
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signInWithGoogle, signOut, continueAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { signInWithGoogle, signOut as authSignOut } from '../lib/auth';
import type { AuthState, UserProfile } from '../types';
import type { Session } from '@supabase/supabase-js';

// ─── Context Types ──────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Skip auth for local development / demo mode */
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
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        isLoading: false,
        isAuthenticated: !!session,
        user: mapSessionToUser(session),
      });
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState({
          isLoading: false,
          isAuthenticated: !!session,
          user: mapSessionToUser(session),
        });
      },
    );

    return () => subscription.unsubscribe();
  }, [mapSessionToUser]);

  const signIn = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in failed:', error);
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setState({ isLoading: false, isAuthenticated: false, user: null });
  }, []);

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
    <AuthContext.Provider value={{ ...state, signIn, signOut, continueAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

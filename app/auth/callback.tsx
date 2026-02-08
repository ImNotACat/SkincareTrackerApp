import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../src/lib/supabase';

/**
 * OAuth callback handler route.
 * On web the browser redirects here after Supabase OAuth completes.
 * It extracts the tokens from the URL and establishes the session.
 */
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const url = await Linking.getInitialURL();

        if (url) {
          let accessToken: string | null = null;
          let refreshToken: string | null = null;

          // Check hash fragment (most common for Supabase OAuth)
          if (url.includes('#')) {
            const hashParams = new URLSearchParams(url.split('#')[1]);
            accessToken = hashParams.get('access_token');
            refreshToken = hashParams.get('refresh_token');
          }

          // Fallback: check query params / regex
          if (!accessToken) {
            const tokenMatch = url.match(/access_token=([^&#]+)/);
            const refreshMatch = url.match(/refresh_token=([^&#]+)/);
            accessToken = tokenMatch ? tokenMatch[1] : null;
            refreshToken = refreshMatch ? refreshMatch[1] : null;
          }

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) console.error('Error setting session in callback:', error);
          }
        }

        // Auth gate in _layout.tsx will redirect to the right place
        router.replace('/');
      } catch (error) {
        console.error('Error in auth callback:', error);
        router.replace('/login');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 16,
    color: '#666',
  },
});

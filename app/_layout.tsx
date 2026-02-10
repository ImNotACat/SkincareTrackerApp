import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { ProductsProvider } from '../src/contexts/ProductsContext';
import { RoutineProvider } from '../src/contexts/RoutineContext';
import { ConfirmProvider } from '../src/contexts/ConfirmContext';
import { ProductPreviewProvider } from '../src/contexts/ProductPreviewContext';
import { ToastProvider } from '../src/components/Toast';

function RootLayoutNav() {
  const { colors, theme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Auth gate: redirect based on session state
  useEffect(() => {
    if (isLoading) return;

    const onLoginScreen = segments[0] === 'login';
    const onAuthCallback = segments[0] === 'auth';

    if (!isAuthenticated && !onLoginScreen && !onAuthCallback) {
      router.replace('/login');
    } else if (isAuthenticated && (onLoginScreen || onAuthCallback)) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={[loadingStyles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-step"
          options={{ title: 'Add Step', presentation: 'modal' }}
        />
        <Stack.Screen
          name="edit-step"
          options={{ title: 'Edit Step', presentation: 'modal' }}
        />
        <Stack.Screen
          name="edit-product"
          options={{ title: 'Edit Product', presentation: 'modal' }}
        />
        <Stack.Screen
          name="product-detail"
          options={{ title: 'Product Details' }}
        />
        <Stack.Screen
          name="ingredient-detail"
          options={{ title: 'Ingredient' }}
        />
        <Stack.Screen
          name="product-preview"
          options={{ title: 'Product Details' }}
        />
        <Stack.Screen
          name="add-entry"
          options={{ title: 'New Entry', presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProductsProvider>
          <RoutineProvider>
            <ConfirmProvider>
              <ProductPreviewProvider>
                <ToastProvider>
                  <RootLayoutNav />
                </ToastProvider>
              </ProductPreviewProvider>
            </ConfirmProvider>
          </RoutineProvider>
        </ProductsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

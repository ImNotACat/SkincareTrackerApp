import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { Typography } from '../src/constants/theme';

function ThemedStack() {
  const { colors } = useTheme();
  
  return (
    <>
      <StatusBar style={colors.background === '#1A1A1A' ? 'light' : 'dark'} />
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
        <Stack.Screen
          name="add-step"
          options={{
            title: 'Add Step',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="edit-step"
          options={{
            title: 'Edit Step',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="add-product"
          options={{
            title: 'Add Product',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="edit-product"
          options={{
            title: 'Edit Product',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="product-detail"
          options={{
            title: 'Product Details',
          }}
        />
        <Stack.Screen
          name="add-entry"
          options={{
            title: 'New Entry',
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemedStack />
      </AuthProvider>
    </ThemeProvider>
  );
}

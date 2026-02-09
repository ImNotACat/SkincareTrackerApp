import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Typography, Spacing, BorderRadius } from '../constants/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  showToast: (title: string, options?: {
    message?: string;
    variant?: ToastVariant;
    duration?: number;
  }) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// ─── Variant Config ──────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<ToastVariant, { icon: string; }> = {
  success: { icon: 'checkmark-circle' },
  error: { icon: 'close-circle' },
  warning: { icon: 'warning' },
  info: { icon: 'information-circle' },
};

function getVariantColor(variant: ToastVariant, colors: any): string {
  switch (variant) {
    case 'success': return colors.success;
    case 'error': return colors.error;
    case 'warning': return colors.warning;
    case 'info': return colors.info;
  }
}

// ─── Single Toast ────────────────────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  const variantColor = getVariantColor(toast.variant, colors);
  const config = VARIANT_CONFIG[toast.variant];

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    const timeout = setTimeout(() => {
      dismissToast();
    }, toast.duration || 3000);

    return () => clearTimeout(timeout);
  }, []);

  const dismissToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(toast.id));
  };

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          top: insets.top + 8,
          backgroundColor: colors.surface,
          borderColor: variantColor + '30',
          shadowColor: colors.text,
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.toastContent}
        onPress={dismissToast}
        activeOpacity={0.9}
      >
        {/* Accent bar */}
        <View style={[styles.accentBar, { backgroundColor: variantColor }]} />

        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: variantColor + '15' }]}>
          <Ionicons name={config.icon as any} size={22} color={variantColor} />
        </View>

        {/* Text */}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {toast.title}
          </Text>
          {toast.message && (
            <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
              {toast.message}
            </Text>
          )}
        </View>

        {/* Dismiss */}
        <TouchableOpacity
          onPress={dismissToast}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.dismissButton}
        >
          <Ionicons name="close" size={16} color={colors.textLight} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((title: string, options?: {
    message?: string;
    variant?: ToastVariant;
    duration?: number;
  }) => {
    const newToast: ToastMessage = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      title,
      message: options?.message,
      variant: options?.variant || 'success',
      duration: options?.duration || 3000,
    };

    setToasts((prev) => {
      // Only keep the latest toast to avoid stacking
      return [newToast];
    });
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Render toasts above everything */}
      <View style={styles.toastOverlay} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={handleDismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  toastOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
  },
  toastContainer: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md - 2,
    paddingRight: Spacing.md,
    paddingLeft: 0,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: BorderRadius.md,
    borderBottomLeftRadius: BorderRadius.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md - 2,
    marginRight: Spacing.sm + 2,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  message: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    marginTop: 2,
  },
  dismissButton: {
    padding: 4,
  },
});

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAuth } from '../src/contexts/AuthContext';

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { signIn, continueAsGuest, isLoading } = useAuth();

  const handleGoogleSignIn = async () => {
    await signIn();
    router.replace('/(tabs)');
  };

  const handleGuest = () => {
    continueAsGuest();
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        {/* Decorative circles */}
        <View style={styles.decorCircleOuter}>
          <View style={styles.decorCircleInner}>
            <Ionicons name="leaf-outline" size={40} color={colors.primary} />
          </View>
        </View>

        <Text style={styles.heading}>
          An Evolving{'\n'}collection of{'\n'}treatments
        </Text>

        <Text style={styles.description}>
          Track your daily skincare routine with care.{'\n'}
          Clinical formulations, personal rituals.
        </Text>
      </View>

      {/* Feature pills */}
      <View style={styles.pillsContainer}>
        <View style={styles.featurePill}>
          <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.featurePillText}>Morning & evening routines</Text>
        </View>
        <View style={styles.featurePill}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={styles.featurePillText}>Per-day customization</Text>
        </View>
        <View style={styles.featurePill}>
          <Ionicons name="flask-outline" size={18} color={colors.primary} />
          <Text style={styles.featurePillText}>Product tracking</Text>
        </View>
      </View>

      {/* Auth Section */}
      <View style={styles.authSection}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <>
              <Ionicons name="logo-google" size={18} color={colors.textOnPrimary} />
              <Text style={styles.continueButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleGuest}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  topSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  decorCircleOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  decorCircleInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  description: {
    ...Typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 20,
  },
  pillsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md + 4,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: Spacing.sm,
  },
  featurePillText: {
    ...Typography.body,
    color: colors.text,
    fontSize: 14,
  },
  authSection: {
    gap: Spacing.md,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  continueButtonText: {
    ...Typography.button,
    color: colors.textOnPrimary,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  skipText: {
    ...Typography.bodySmall,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});

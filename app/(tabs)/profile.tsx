import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRoutine } from '../../src/hooks/useRoutine';
import { useProducts } from '../../src/hooks/useProducts';

const createStyles = (colors: typeof import('../../src/constants/theme').Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: Spacing.md + 4,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  displayName: {
    ...Typography.subtitle,
    fontSize: 20,
    color: colors.text,
  },
  email: {
    ...Typography.bodySmall,
    marginTop: Spacing.xs,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    fontSize: 11,
    color: colors.textLight,
  },
  sectionTitle: {
    ...Typography.label,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    marginLeft: 2,
    color: colors.textSecondary,
  },
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm + 4,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    ...Typography.body,
    flex: 1,
    color: colors.text,
  },
  settingValue: {
    ...Typography.caption,
    marginRight: Spacing.xs,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: Spacing.md + 32 + Spacing.sm + 4,
  },
  bottomSpacer: {
    height: Spacing.xxl,
  },
});

function SettingRow({
  icon,
  label,
  value,
  onPress,
  danger,
  colors,
  styles,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  colors: typeof import('../../src/constants/theme').Colors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.settingIcon, danger && { backgroundColor: colors.error + '12' }]}>
        <Ionicons
          name={icon as any}
          size={18}
          color={danger ? colors.error : colors.primary}
        />
      </View>
      <Text style={[styles.settingLabel, danger && { color: colors.error }]}>
        {label}
      </Text>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {onPress && (
        <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user, signOut, isAuthenticated } = useAuth();
  const { steps, getTodayProgress } = useRoutine();
  const { activeProducts, products: allProducts } = useProducts();
  const { theme, toggleTheme } = useTheme();
  const progress = getTodayProgress();
  const styles = createStyles(colors);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={28} color={colors.primary} />
        </View>
        <Text style={styles.displayName}>
          {user?.display_name || 'Skincare Lover'}
        </Text>
        <Text style={styles.email}>{user?.email || 'Not signed in'}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { value: steps.length, label: 'Steps' },
          { value: progress.completed, label: 'Done' },
          { value: activeProducts.length, label: 'Products' },
          { value: allProducts.length - activeProducts.length, label: 'Stopped' },
        ].map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Settings */}
      <Text style={styles.sectionTitle}>SETTINGS</Text>
      <View style={styles.settingsCard}>
        <SettingRow
          icon="color-palette-outline"
          label="Theme"
          value={theme === 'dark' ? 'Dark' : 'Light'}
          onPress={toggleTheme}
          colors={colors}
          styles={styles}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="notifications-outline"
          label="Reminders"
          value="Off"
          onPress={() =>
            Alert.alert('Coming Soon', 'Reminders will be available in a future update.')
          }
          colors={colors}
          styles={styles}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="cloud-outline"
          label="Cloud Sync"
          value={isAuthenticated && user?.id !== 'guest' ? 'Connected' : 'Off'}
          onPress={() =>
            Alert.alert(
              'Cloud Sync',
              'Configure your Supabase credentials in .env and sign in with Google to enable sync.',
            )
          }
          colors={colors}
          styles={styles}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="information-circle-outline"
          label="About"
          value="v1.0.0"
          onPress={() =>
            Alert.alert(
              'Glow',
              'Your daily skincare companion.\n\nBuilt with React Native, Expo Router, and Supabase.',
            )
          }
          colors={colors}
          styles={styles}
        />
      </View>

      {/* Account */}
      <Text style={styles.sectionTitle}>ACCOUNT</Text>
      <View style={styles.settingsCard}>
        <SettingRow
          icon="log-out-outline"
          label="Sign Out"
          onPress={handleSignOut}
          danger
          colors={colors}
          styles={styles}
        />
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

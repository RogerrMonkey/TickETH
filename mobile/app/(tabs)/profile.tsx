import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Linking,
  Share,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { ProfileSkeleton } from '../../src/components/Skeleton';
import { useAuth } from '../../src/providers/AuthProvider';
import { useWallet } from '../../src/providers/WalletProvider';
import { shortenAddress } from '../../src/utils/format';
import { CHAIN_CONFIG, CONTRACTS } from '../../src/constants/config';
import { getAddressUrl } from '../../src/services/wallet';
import { showToast } from '../../src/services/toast';
import { analytics } from '../../src/services/analytics';

export default function ProfileScreen() {
  const { user, hydrated } = useAuth();
  const { address, connected, disconnect } = useWallet();
  const [copiedAddress, setCopiedAddress] = useState(false);

  useEffect(() => {
    analytics.screenView('profile');
  }, []);

  const handleLogout = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert('Disconnect Wallet', 'You will be signed out of TickETH.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          analytics.track('wallet_disconnected', {});
          await disconnect();
          showToast({ type: 'info', title: 'Disconnected' });
          router.replace('/auth');
        },
      },
    ]);
  }, [disconnect]);

  const copyAddress = useCallback(async () => {
    if (address) {
      await Clipboard.setStringAsync(address);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setCopiedAddress(true);
      showToast({ type: 'success', title: 'Copied', message: 'Address copied to clipboard' });
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  }, [address]);

  const shareAddress = useCallback(async () => {
    if (address) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await Share.share({ message: `My TickETH wallet: ${address}` });
    }
  }, [address]);

  const viewOnExplorer = useCallback(() => {
    if (address) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      Linking.openURL(getAddressUrl(address));
    }
  }, [address]);

  // Generate avatar color from wallet address
  const avatarColor = address ? `#${address.slice(2, 8)}` : Colors.primary;
  const avatarInitial = address ? address.slice(2, 4).toUpperCase() : '?';

  // Show skeleton while hydrating
  if (!hydrated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.screenTitle} accessibilityRole="header">
            Profile
          </Text>
        </View>
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle} accessibilityRole="header">
            Profile
          </Text>
        </View>

        {/* Avatar & wallet card */}
        <View style={styles.profileCard}>
          <View
            style={[styles.avatar, { backgroundColor: avatarColor }]}
            accessibilityLabel="Profile avatar"
          >
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </View>

          <Text style={styles.displayName}>
            {user?.display_name || 'TickETH User'}
          </Text>

          {user?.role && (
            <Badge
              label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              variant={
                user.role === 'admin'
                  ? 'error'
                  : user.role === 'organizer'
                  ? 'warning'
                  : user.role === 'volunteer'
                  ? 'info'
                  : 'primary'
              }
              size="md"
            />
          )}

          {/* Wallet address - tap to copy */}
          <TouchableOpacity
            style={styles.addressRow}
            onPress={copyAddress}
            activeOpacity={0.7}
            accessibilityLabel={`Wallet address: ${address ? shortenAddress(address, 8) : 'Not connected'}. Tap to copy.`}
            accessibilityRole="button"
          >
            <View style={styles.addressDot} />
            <Text style={styles.addressText}>
              {address ? shortenAddress(address, 8) : 'Not connected'}
            </Text>
            <Ionicons
              name={copiedAddress ? 'checkmark' : 'copy-outline'}
              size={16}
              color={copiedAddress ? Colors.success : Colors.textMuted}
            />
          </TouchableOpacity>

          {/* Quick actions row */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={viewOnExplorer}
              accessibilityLabel="View on block explorer"
              accessibilityRole="button"
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="open-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.quickActionLabel}>Explorer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={shareAddress}
              accessibilityLabel="Share wallet address"
              accessibilityRole="button"
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="share-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.quickActionLabel}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={copyAddress}
              accessibilityLabel="Copy wallet address"
              accessibilityRole="button"
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="copy-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.quickActionLabel}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Email missing prompt */}
        {user && !user.email && (
          <TouchableOpacity
            style={styles.emailBanner}
            onPress={() => router.push('/edit-profile')}
            activeOpacity={0.7}
            accessibilityLabel="Add your email address"
            accessibilityRole="button"
          >
            <Ionicons name="warning" size={18} color="#F59E0B" />
            <View style={styles.emailBannerText}>
              <Text style={styles.emailBannerTitle}>Email Required</Text>
              <Text style={styles.emailBannerSub}>
                Add your email to receive ticket copies
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Account details */}
        {user && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Details</Text>
            <View style={styles.infoCard}>
              <InfoRow icon="finger-print" label="User ID" value={user.id.slice(0, 8) + '...'} />
              <InfoRow icon="shield-checkmark" label="Role" value={user.role.charAt(0).toUpperCase() + user.role.slice(1)} />
              {user.email && <InfoRow icon="mail" label="Email" value={user.email} />}
              <InfoRow
                icon="time"
                label="Member Since"
                value={new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                isLast
              />
            </View>
          </View>
        )}

        {/* Network info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Network</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="globe" label="Chain" value={CHAIN_CONFIG.chainName} />
            <InfoRow icon="link" label="Chain ID" value={String(CHAIN_CONFIG.chainId)} />
            <InfoRow icon="server" label="Currency" value={CHAIN_CONFIG.nativeCurrency.symbol} />
            <InfoRow icon="cube" label="Factory" value={shortenAddress(CONTRACTS.factory, 6)} isLast />
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="person-outline"
              label="Edit Profile"
              subtitle="Name, email, avatar"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                analytics.track('edit_profile_opened', {});
                router.push('/edit-profile');
              }}
            />
            <MenuItem
              icon="storefront-outline"
              label="Marketplace"
              subtitle="Browse & list tickets"
              onPress={() => {
                analytics.track('marketplace_opened', {});
                router.push('/marketplace');
              }}
            />
            <MenuItem
              icon="notifications-outline"
              label="Notifications"
              subtitle="Manage push notifications"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                Alert.alert('Notifications', 'Push notifications are enabled.');
              }}
            />
            <MenuItem
              icon="help-circle-outline"
              label="Help & Support"
              subtitle="FAQ, contact us"
              onPress={() => Linking.openURL('https://ticketh.io/support')}
            />
            <MenuItem
              icon="document-text-outline"
              label="Terms of Service"
              subtitle="Legal & privacy"
              onPress={() => Linking.openURL('https://ticketh.io/terms')}
              isLast
            />
          </View>
        </View>

        {/* Disconnect */}
        <View style={styles.actions}>
          <Button
            title="Disconnect Wallet"
            onPress={handleLogout}
            variant="danger"
            fullWidth
            size="lg"
            icon={<Ionicons name="log-out" size={18} color={Colors.textPrimary} />}
          />
        </View>

        <Text style={styles.version}>TickETH v1.0.0 • Polygon Amoy Testnet</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      style={[styles.infoRow, !isLast && styles.infoRowBorder]}
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={18} color={Colors.textMuted} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  subtitle,
  onPress,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, !isLast && styles.menuItemBorder]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${label}: ${subtitle}`}
      accessibilityRole="button"
    >
      <View style={styles.menuItemLeft}>
        <View style={styles.menuItemIcon}>
          <Ionicons name={icon} size={20} color={Colors.primary} />
        </View>
        <View>
          <Text style={styles.menuItemLabel}>{label}</Text>
          <Text style={styles.menuItemSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing['6xl'],
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  screenTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.extrabold,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    padding: Spacing['2xl'],
    borderRadius: BorderRadius.xl,
    ...Shadows.lg,
    gap: Spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
  },
  displayName: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.full,
  },
  addressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  addressText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontFamily: 'monospace',
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing['2xl'],
    marginTop: Spacing.lg,
  },
  quickAction: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  section: {
    marginTop: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
  },
  emailBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  emailBannerText: {
    flex: 1,
  },
  emailBannerTitle: {
    color: '#F59E0B',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  emailBannerSub: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginTop: 1,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: Spacing.md,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
  },
  infoValue: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  menuItemSubtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginTop: 1,
  },
  actions: {
    marginTop: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
  },
  version: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    marginTop: Spacing['2xl'],
  },
});

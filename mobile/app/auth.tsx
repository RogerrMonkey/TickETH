import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConnectButton } from 'thirdweb/react-native';
import { inAppWallet, createWallet } from 'thirdweb/wallets';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
import { thirdwebClient, activeChain } from '../src/constants/config';
import { useAuth } from '../src/providers/AuthProvider';
import { analytics } from '../src/services/analytics';
import { Skeleton } from '../src/components/Skeleton';

const { width } = Dimensions.get('window');

/** Wallets offered to users */
const wallets = [
  inAppWallet({
    auth: {
      options: ['email', 'google', 'apple', 'phone'],
    },
  }),
  createWallet('io.metamask'),
  createWallet('com.coinbase.wallet'),
  createWallet('me.rainbow'),
];

export default function AuthScreen() {
  const { loading, isAuthenticated, hydrated } = useAuth();

  // Fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
    ]).start();
    analytics.screenView('auth');
  }, []);

  // Navigate on authenticated
  useEffect(() => {
    if (isAuthenticated) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      analytics.track('auth_success');
      router.replace('/(tabs)/events');
    }
  }, [isAuthenticated]);

  // Shimmer skeleton during hydration
  if (!hydrated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.heroSection}>
            <Skeleton width={96} height={96} borderRadius={24} />
            <View style={{ height: 20 }} />
            <Skeleton width={160} height={40} />
            <View style={{ height: 12 }} />
            <Skeleton width={220} height={16} />
          </View>
          <View style={{ gap: Spacing.xl, paddingHorizontal: Spacing.lg }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
                <Skeleton width={44} height={44} borderRadius={10} />
                <View style={{ flex: 1 }}>
                  <Skeleton width="60%" height={15} />
                  <View style={{ height: 4 }} />
                  <Skeleton width="80%" height={12} />
                </View>
              </View>
            ))}
          </View>
          <View style={{ alignItems: 'center' }}>
            <Skeleton width={width - Spacing['2xl'] * 2} height={56} borderRadius={BorderRadius.lg} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        {/* Logo & branding */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="ticket" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>TickETH</Text>
          <Text style={styles.tagline}>
            Blockchain NFT Ticketing{'\n'}Secure. Transparent. Yours.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureRow
            icon="shield-checkmark"
            title="Fraud-Proof Tickets"
            desc="Every ticket is a verifiable NFT on Polygon"
          />
          <FeatureRow
            icon="qr-code"
            title="Instant Check-in"
            desc="Dynamic QR codes with two-step verification"
          />
          <FeatureRow
            icon="swap-horizontal"
            title="Safe Resale"
            desc="Controlled marketplace with price caps"
          />
        </View>

        {/* Thirdweb Connect Button */}
        <View style={styles.connectSection}>
          <ConnectButton
            client={thirdwebClient}
            wallets={wallets}
            chain={activeChain}
            connectButton={{
              label: loading ? 'Connecting...' : 'Connect Wallet',
              style: {
                backgroundColor: Colors.primary,
                width: width - Spacing['2xl'] * 2,
                height: 56,
                borderRadius: BorderRadius.lg,
              },
            }}
            connectModal={{
              title: 'Sign in to TickETH',
              size: 'compact',
            }}
            theme="dark"
          />
          <Text style={styles.disclaimer}>
            By connecting, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>

        {/* Network badge */}
        <View style={styles.networkBadge}>
          <View style={styles.networkDot} />
          <Text style={styles.networkText}>Polygon Amoy Testnet</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

function FeatureRow({
  icon,
  title,
  desc,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={22} color={Colors.primary} />
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
    justifyContent: 'space-between',
    paddingBottom: Spacing['3xl'],
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: Spacing['5xl'],
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
    marginBottom: Spacing.xl,
  },
  appName: {
    fontSize: Typography.sizes.hero,
    fontWeight: Typography.weights.extrabold,
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  features: {
    gap: Spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  featureDesc: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
  connectSection: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  disclaimer: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  networkText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
  },
});

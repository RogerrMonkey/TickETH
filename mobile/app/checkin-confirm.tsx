import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
import { Button } from '../src/components/ui/Button';
import { Header } from '../src/components/ui/Header';
import { Card } from '../src/components/ui/Card';
import { ConfettiAnimation } from '../src/components/ConfettiAnimation';
import { TicketCardSkeleton } from '../src/components/Skeleton';
import { useWallet } from '../src/providers/WalletProvider';
import { checkinApi } from '../src/api';
import { useTicket } from '../src/hooks/useTickets';
import { parseError } from '../src/services/errorParser';
import { showToast } from '../src/services/toast';
import { analytics } from '../src/services/analytics';

const CONFIRMATION_TIMEOUT_SEC = 120; // 2 minutes

export default function CheckinConfirmScreen() {
  const { checkinLogId, ticketId } = useLocalSearchParams<{
    checkinLogId: string;
    ticketId: string;
  }>();

  const { address, signMessage } = useWallet();
  const { ticket, loading: ticketLoading } = useTicket(ticketId ?? '');
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(CONFIRMATION_TIMEOUT_SEC);
  const [showConfetti, setShowConfetti] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const resultFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    analytics.screenView('checkin_confirm');
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (confirmed || denied) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          showToast({ type: 'warning', title: 'Timed out', message: 'Confirmation window expired.' });
          analytics.track('checkin_timeout', { checkinLogId });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [confirmed, denied]);

  const timerMinutes = Math.floor(timeLeft / 60);
  const timerSeconds = timeLeft % 60;
  const timerColor = timeLeft <= 30 ? Colors.error : timeLeft <= 60 ? Colors.warning : Colors.textMuted;

  /* ── Confirm handler ─────────────────────────────────── */
  const handleConfirm = useCallback(async () => {
    if (!address || !checkinLogId || timeLeft === 0) return;

    setConfirming(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    analytics.track('checkin_confirm_started', { checkinLogId });

    try {
      const message = [
        'Confirm check-in for TickETH',
        `Checkin: ${checkinLogId}`,
        `Wallet: ${address}`,
        `Timestamp: ${Date.now()}`,
      ].join('\n');

      await signMessage(message);
      await checkinApi.confirmCheckin(checkinLogId, address);

      setConfirmed(true);
      setShowConfetti(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      analytics.track('checkin_confirmed', { checkinLogId });
      showToast({ type: 'success', title: 'Check-in confirmed!' });

      Animated.timing(resultFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (err: any) {
      const parsed = parseError(err);
      setError(parsed.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      analytics.track('checkin_confirm_failed', { checkinLogId, error: parsed.message });
    } finally {
      setConfirming(false);
    }
  }, [address, checkinLogId, timeLeft, signMessage]);

  /* ── Deny handler ────────────────────────────────────── */
  const handleDeny = useCallback(() => {
    Alert.alert(
      'Deny Check-in',
      'Are you sure you want to deny this check-in? The scan will be marked as failed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: () => {
            setDenied(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            analytics.track('checkin_denied', { checkinLogId });
            showToast({ type: 'info', title: 'Check-in denied' });
            Animated.timing(resultFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
          },
        },
      ],
    );
  }, [checkinLogId]);

  /* ── Success state ───────────────────────────────────── */
  if (confirmed) {
    return (
      <SafeAreaView style={styles.container}>
        {showConfetti && <ConfettiAnimation />}
        <Animated.View style={[styles.resultContainer, { opacity: resultFade }]}>
          <View style={[styles.resultIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
            <Ionicons name="checkmark-circle" size={96} color={Colors.success} />
          </View>
          <Text style={styles.resultTitle}>Check-in Confirmed!</Text>
          <Text style={styles.resultMessage}>
            You're all set. Enjoy the event!
          </Text>
          <Button
            title="Done"
            onPress={() => router.back()}
            variant="primary"
            fullWidth
            size="lg"
            style={{ marginTop: Spacing['3xl'] }}
          />
        </Animated.View>
      </SafeAreaView>
    );
  }

  /* ── Deny state ──────────────────────────────────────── */
  if (denied) {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={[styles.resultContainer, { opacity: resultFade }]}>
          <View style={[styles.resultIcon, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
            <Ionicons name="close-circle" size={96} color={Colors.error} />
          </View>
          <Text style={styles.resultTitle}>Check-in Denied</Text>
          <Text style={styles.resultMessage}>
            This check-in attempt has been rejected.
          </Text>
          <Button
            title="Done"
            onPress={() => router.back()}
            variant="outline"
            fullWidth
            size="lg"
            style={{ marginTop: Spacing['3xl'] }}
          />
        </Animated.View>
      </SafeAreaView>
    );
  }

  /* ── Main confirmation UI ────────────────────────────── */
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Check-in Confirmation"
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
      />

      <Animated.View
        style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
      >
        {/* Timer */}
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={16} color={timerColor} />
          <Text style={[styles.timerText, { color: timerColor }]}>
            {timerMinutes}:{timerSeconds.toString().padStart(2, '0')}
          </Text>
        </View>

        {/* Illustration */}
        <View style={styles.alertIcon}>
          <Ionicons name="scan-circle" size={80} color={Colors.primary} />
        </View>

        <Text style={styles.title} accessibilityRole="header">
          Confirm Your Entry
        </Text>
        <Text style={styles.subtitle}>
          A volunteer has scanned your ticket.{'\n'}
          Please confirm to complete check-in.
        </Text>

        {/* Ticket info */}
        {ticketLoading ? (
          <View style={{ width: '100%' }}>
            <TicketCardSkeleton />
          </View>
        ) : ticket ? (
          <Card variant="elevated" style={styles.ticketCard}>
            <InfoRow label="Event" value={ticket.event?.title ?? 'Event'} />
            <InfoRow label="Tier" value={ticket.tier?.name ?? 'General'} />
            <InfoRow label="Token" value={`#${ticket.token_id}`} />
            <InfoRow label="Venue" value={ticket.event?.venue ?? '—'} isLast />
          </Card>
        ) : null}

        {/* Error */}
        {error && (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Timeout message */}
        {timeLeft === 0 && (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Ionicons name="time-outline" size={18} color={Colors.warning} />
            <Text style={[styles.errorText, { color: Colors.warning }]}>
              Confirmation window expired. Please ask the volunteer to scan again.
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title={confirming ? 'Signing...' : 'Confirm Check-in'}
            onPress={handleConfirm}
            loading={confirming}
            disabled={timeLeft === 0}
            fullWidth
            size="lg"
            icon={<Ionicons name="shield-checkmark" size={20} color={Colors.textPrimary} />}
          />
          <Button
            title="Deny Entry"
            onPress={handleDeny}
            variant="ghost"
            fullWidth
            size="lg"
          />
        </View>

        <Text style={styles.securityNote}>
          Your wallet signature verifies ticket ownership on-chain
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function InfoRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  timerText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    fontFamily: 'monospace',
  },
  alertIcon: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
    marginBottom: Spacing['2xl'],
  },
  ticketCard: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },
  infoValue: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    maxWidth: '60%',
    textAlign: 'right',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    width: '100%',
    marginBottom: Spacing.lg,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.sm,
    flex: 1,
  },
  actions: {
    width: '100%',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  securityNote: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    marginTop: Spacing['2xl'],
  },
  /* Result screens */
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
  },
  resultIcon: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  resultTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
  },
  resultMessage: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

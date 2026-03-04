import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useActiveAccount } from 'thirdweb/react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Header } from '../../src/components/ui/Header';
import { Badge } from '../../src/components/ui/Badge';
import { Card } from '../../src/components/ui/Card';
import { TicketCardSkeleton } from '../../src/components/Skeleton';
import { ConfettiAnimation } from '../../src/components/ConfettiAnimation';
import { useMyTickets } from '../../src/hooks/useTickets';
import { marketplaceApi } from '../../src/api';
import { showToast } from '../../src/services/toast';
import { parseError } from '../../src/services/errorParser';
import { analytics } from '../../src/services/analytics';
import { formatPrice } from '../../src/utils/format';
import type { Ticket } from '../../src/types';

export default function CreateListingScreen() {
  const account = useActiveAccount();
  const { tickets, loading: ticketsLoading } = useMyTickets();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [priceError, setPriceError] = useState<string | null>(null);
  const [listing, setListing] = useState(false);
  const [success, setSuccess] = useState(false);

  // Only show active, mintable tickets not already listed
  const listableTickets = tickets.filter(
    (t) => t.status === 'minted' && t.tier?.resale_allowed !== false,
  );

  useEffect(() => {
    analytics.screenView('create_listing');
  }, []);

  const validatePrice = useCallback((text: string) => {
    setPriceInput(text);
    if (!text) {
      setPriceError(null);
      return;
    }
    const num = parseFloat(text);
    if (isNaN(num) || num <= 0) {
      setPriceError('Enter a valid price');
    } else {
      setPriceError(null);
    }
  }, []);

  const handleCreate = useCallback(async () => {
    if (!selectedTicket || !priceInput || priceError || !account) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    analytics.track('listing_create_started', { ticketId: selectedTicket.id });
    setListing(true);

    try {
      // Convert price to wei-like string (simplified: multiply by 1e18)
      const priceWei = BigInt(Math.round(parseFloat(priceInput) * 1e18)).toString();

      // In production this would call the on-chain marketplace contract first
      // For now we record the listing directly
      await marketplaceApi.createListing({
        ticketId: selectedTicket.id,
        price: priceWei,
        txHash: '0x' + '0'.repeat(64), // placeholder until on-chain integration
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      analytics.track('listing_created', { ticketId: selectedTicket.id, price: priceInput });
      showToast({ type: 'success', title: 'Listed!', message: 'Your ticket is now on the marketplace.' });
      setSuccess(true);
    } catch (err) {
      const parsed = parseError(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showToast({ type: 'error', title: 'Listing Failed', message: parsed.message, duration: 5000 });
      analytics.track('listing_create_failed', { error: parsed.message });
    } finally {
      setListing(false);
    }
  }, [selectedTicket, priceInput, priceError, account]);

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <ConfettiAnimation />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={96} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>Listed Successfully!</Text>
          <Text style={styles.successMessage}>
            Your ticket is now available for purchase on the marketplace.
          </Text>
          <Button
            title="View Marketplace"
            onPress={() => router.replace('/marketplace')}
            variant="primary"
            fullWidth
            size="lg"
            style={{ marginTop: Spacing['3xl'] }}
          />
          <Button
            title="Done"
            onPress={() => router.back()}
            variant="outline"
            fullWidth
            size="lg"
            style={{ marginTop: Spacing.md }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit = selectedTicket && priceInput && !priceError && !listing;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Create Listing" leftIcon="arrow-back" onLeftPress={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step 1: Select ticket */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Select Ticket</Text>
            {ticketsLoading ? (
              <TicketCardSkeleton />
            ) : listableTickets.length === 0 ? (
              <Card variant="outlined" style={styles.emptyCard}>
                <Ionicons name="ticket-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No eligible tickets to list</Text>
                <Text style={styles.emptySubtext}>
                  Only active tickets with resale enabled can be listed.
                </Text>
              </Card>
            ) : (
              listableTickets.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                return (
                  <TouchableOpacity
                    key={ticket.id}
                    style={[styles.ticketOption, isSelected && styles.ticketOptionSelected]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setSelectedTicket(isSelected ? null : ticket);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${ticket.event?.title ?? 'Ticket'} - ${ticket.tier?.name ?? 'General'}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ticketOptionTitle}>
                        {ticket.event?.title ?? 'Event'}
                      </Text>
                      <Text style={styles.ticketOptionTier}>
                        {ticket.tier?.name ?? 'General'} • #{ticket.token_id}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                    )}
                    {ticket.tier?.price && (
                      <Text style={styles.ticketOptionPrice}>
                        Paid: {formatPrice(ticket.tier.price)}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Step 2: Set price */}
          {selectedTicket && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Set Resale Price</Text>
              <Input
                placeholder="0.01"
                value={priceInput}
                onChangeText={validatePrice}
                error={priceError ?? undefined}
                keyboardType="decimal-pad"
                icon={<Ionicons name="diamond-outline" size={18} color={Colors.textMuted} />}
              />
              {selectedTicket.tier?.price && (
                <Text style={styles.priceHint}>
                  Original price: {formatPrice(selectedTicket.tier.price)}
                </Text>
              )}

              {/* Preview */}
              {priceInput && !priceError && (
                <Card variant="outlined" style={styles.previewCard}>
                  <Text style={styles.previewTitle}>Listing Preview</Text>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Ticket</Text>
                    <Text style={styles.previewValue}>
                      {selectedTicket.event?.title ?? 'Event'} #{selectedTicket.token_id}
                    </Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Price</Text>
                    <Text style={[styles.previewValue, { color: Colors.primary }]}>
                      {priceInput} POL
                    </Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Gas</Text>
                    <Text style={styles.previewValue}>Paid in POL</Text>
                  </View>
                </Card>
              )}
            </View>
          )}

          {/* Submit */}
          <Button
            title={listing ? 'Creating Listing...' : 'List for Sale'}
            onPress={handleCreate}
            loading={listing}
            disabled={!canSubmit}
            fullWidth
            size="lg"
            icon={<Ionicons name="storefront" size={20} color={Colors.textPrimary} />}
            style={{ marginTop: Spacing.xl }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['6xl'],
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  emptySubtext: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
  ticketOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ticketOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceHighlight,
  },
  ticketOptionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  ticketOptionTier: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
  ticketOptionPrice: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginLeft: Spacing.md,
  },
  priceHint: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.sm,
  },
  previewCard: {
    marginTop: Spacing.lg,
  },
  previewTitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  previewLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },
  previewValue: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    maxWidth: '60%',
    textAlign: 'right',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
  },
  successIcon: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(16,185,129,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  successTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
  },
  successMessage: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
